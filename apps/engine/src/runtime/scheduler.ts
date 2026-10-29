import { automationModel } from '../agents/availability.js'
import { listAgentIdsOnDisk } from '../agents/loader.js'
import { getAgent } from '../agents/registry.js'
import { createSession } from '../db/repos/sessions.js'
import { listSchedules, markFired, type Schedule } from '../schedules/loader.js'
import { buildScheduledRunMessage } from '../schedules/message.js'
import { isDue } from '../schedules/cron.js'
import { sweepMemoriesIfDue } from '../memory/maintenance.js'
import { maintainBrainIfDue } from '../brain/maintenance.js'
import { sweepCodexHomesIfDue } from '../connections/codex-sweep.js'
import { startHeadlessRun } from './headless-run.js'
import { sendNotification } from './notify.js'
import { isBudgetLatched } from './budget-latch.js'
import { nowIso } from '../lib/ids.js'
import { agentDisabled, budgetExhausted, HttpError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

const TICK_MS = 30_000

const inFlight = new Map<string, { runId: string; sessionId: string }>()

export async function fireSchedule(agentId: string, schedule: Schedule, opts?: { markFired?: boolean; ignoreBudgetLatch?: boolean }): Promise<{ runId: string; sessionId: string }> {
    const key = `${agentId}/${schedule.slug}`
    const existing = inFlight.get(key)
    if (existing) return existing

    const agent = await getAgent(agentId)
    if (!agent.config.enabled) throw agentDisabled()
    // Resolved before markFired so a budget skip leaves the schedule due: it resumes on the first
    // tick after the latch clears, with no session, no run and no notification in the meantime.
    // Only the managed provider burns the workspace budget, so an agent on its own key still fires.
    const override = await automationModel(agent, schedule, 'schedule')
    if (!opts?.ignoreBudgetLatch && override.provider === 'rerun' && isBudgetLatched()) throw budgetExhausted()
    // Stamped before the launch, not after: a schedule whose run preparation keeps throwing would
    // otherwise stay due forever and re-fire on every 30s tick. The trade-off is at-most-once — a
    // crash mid-run costs that occurrence instead of replaying work that may already be done.
    if (opts?.markFired !== false) await markFired(agentId, schedule.slug, nowIso())
    const session = await createSession(agentId, `schedule: ${schedule.slug}`, undefined, 'schedule')
    await sendNotification({
        event: 'agent.session.created',
        kind: 'info',
        agentId,
        sessionId: session.id,
        runId: null,
        message: `Scheduled run: ${schedule.name}`,
        title: schedule.name,
        source: 'schedule',
    })
    const { runId, settled } = await startHeadlessRun(agent, session.id, buildScheduledRunMessage(schedule), override, { source: 'schedule', slug: schedule.slug, name: schedule.name })

    const started = { runId, sessionId: session.id }
    inFlight.set(key, started)
    logger.info({ agent: agentId, schedule: schedule.slug, runId, session: session.id }, 'scheduled run fired')

    // `settled` always resolves; `result.finishReason` does not when a provider stream hangs, and
    // an entry left in `inFlight` freezes this schedule for the lifetime of the process.
    void settled
        .then(outcome => {
            if (outcome.kind === 'error') logger.error({ agent: agentId, schedule: schedule.slug, err: outcome.error }, 'scheduled run failed')
        })
        .finally(() => inFlight.delete(key))

    return started
}

async function fire(agentId: string, schedule: Schedule): Promise<void> {
    try {
        await fireSchedule(agentId, schedule)
    } catch (err) {
        if (err instanceof HttpError && err.status === 402) {
            logger.debug({ agent: agentId, schedule: schedule.slug }, 'scheduled run skipped: rerun budget latched')
            return
        }
        logger.error({ agent: agentId, schedule: schedule.slug, err: String(err) }, 'scheduled run failed')
    }
}

async function tick(): Promise<void> {
    const now = new Date()
    let agentIds: string[]
    try {
        agentIds = await listAgentIdsOnDisk()
    } catch (err) {
        logger.error({ err: String(err) }, 'scheduler tick failed to list agents')
        return
    }
    void sweepMemoriesIfDue(agentIds)
    void maintainBrainIfDue()
    void sweepCodexHomesIfDue()
    for (const agentId of agentIds) {
        // A switched-off agent normally has its schedules paused too, so this only catches the
        // case where the host could not reach the box at the time. Skipping here rather than
        // letting fireSchedule throw keeps the tick from logging an error every 30 seconds.
        const agent = await getAgent(agentId).catch(() => null)
        if (!agent?.config.enabled) continue

        let schedules: Schedule[]
        try {
            schedules = await listSchedules(agentId)
        } catch (err) {
            logger.error({ agent: agentId, err: String(err) }, 'scheduler failed to load schedules')
            continue
        }
        for (const schedule of schedules) {
            if (isDue(schedule, now)) void fire(agentId, schedule)
        }
    }
}

export function startScheduler(): () => void {
    void tick()
    const timer = setInterval(() => void tick(), TICK_MS)
    return () => clearInterval(timer)
}
