import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { vi } from 'vitest'

process.env.RERUN_DATA_DIR = mkdtempSync(resolve(tmpdir(), 'rerun-scheduler-'))
process.env.RERUN_API_KEY = ''
process.env.RERUN_LOG_LEVEL = 'fatal'

type Outcome = { kind: 'done' | 'error' | 'cancelled'; error?: string }

const state = vi.hoisted(() => ({
    agents: {} as Record<string, { id: string; config: { enabled: boolean } } | Error>,
    agentIds: [] as string[] | Error,
    schedules: {} as Record<string, unknown[] | Error>,
    due: new Set<string>(),
    provider: 'rerun' as string,
    sent: [] as Array<Record<string, unknown>>,
    runs: [] as Array<{ agentId: string; sessionId: string; message: string; override: unknown; trigger: unknown; runId: string; finish: (o: Outcome) => void }>,
    markFired: vi.fn(async (_agentId: string, _slug: string, _at: string) => {}),
    sweep: vi.fn(async (_ids: string[]) => {}),
    sessions: 0,
}))

vi.mock('../agents/availability.js', () => ({
    automationModel: async (_agent: unknown, schedule: { model?: string | null }) => ({ provider: state.provider, model: schedule.model ?? 'm' }),
}))
vi.mock('../agents/loader.js', () => ({
    listAgentIdsOnDisk: async () => {
        if (state.agentIds instanceof Error) throw state.agentIds
        return state.agentIds
    },
}))
vi.mock('../agents/registry.js', () => ({
    getAgent: async (id: string) => {
        const agent = state.agents[id]
        if (!agent || agent instanceof Error) throw agent ?? new Error(`no agent ${id}`)
        return agent
    },
}))
vi.mock('../db/repos/sessions.js', () => ({
    createSession: async (_agentId: string, title: string, _origin: unknown, source: string) => ({ id: `sess-${++state.sessions}`, title, source }),
}))
vi.mock('../schedules/loader.js', () => ({
    listSchedules: async (agentId: string) => {
        const list = state.schedules[agentId] ?? []
        if (list instanceof Error) throw list
        return list
    },
    markFired: state.markFired,
}))
vi.mock('../schedules/cron.js', () => ({
    isDue: (schedule: { slug: string }) => state.due.has(schedule.slug),
}))
vi.mock('../memory/maintenance.js', () => ({ sweepMemoriesIfDue: state.sweep }))
vi.mock('./notify.js', () => ({
    sendNotification: async (input: Record<string, unknown>) => {
        state.sent.push(input)
        return { delivered: true }
    },
}))
vi.mock('./headless-run.js', () => ({
    startHeadlessRun: async (agent: { id: string }, sessionId: string, message: string, override: unknown, trigger: unknown) => {
        let finish!: (o: Outcome) => void
        const settled = new Promise<Outcome>(r => (finish = r))
        const runId = `run-${state.runs.length + 1}`
        state.runs.push({ agentId: agent.id, sessionId, message, override, trigger, runId, finish })
        return { runId, settled }
    },
}))

const { afterEach, beforeEach, describe, expect, it } = await import('vitest')
const { fireSchedule, startScheduler } = await import('./scheduler.js')
const { armBudgetLatch, clearBudgetLatch } = await import('./budget-latch.js')
const { HttpError } = await import('../lib/errors.js')
const { logger } = await import('../lib/logger.js')
type Schedule = import('../schedules/loader.js').Schedule

function schedule(slug: string, extra: Partial<Schedule> = {}): Schedule {
    return { slug, name: `Name ${slug}`, description: '', enabled: true, cron: '* * * * *', runAt: null, timezone: null, lastRunAt: null, connectionId: null, provider: null, model: null, body: `do ${slug}`, createdAt: '2026-01-01T00:00:00.000Z', ...extra }
}

const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
}

beforeEach(() => {
    state.agents = { on: { id: 'on', config: { enabled: true } }, off: { id: 'off', config: { enabled: false } } }
    state.agentIds = []
    state.schedules = {}
    state.due = new Set()
    state.provider = 'rerun'
})

afterEach(async () => {
    for (const run of state.runs) run.finish({ kind: 'done' })
    await flush()
    state.runs = []
    state.sent = []
    state.markFired.mockClear()
    state.sweep.mockClear()
    clearBudgetLatch()
    vi.useRealTimers()
    vi.restoreAllMocks()
})

describe('fireSchedule', () => {
    it('refuses a switched-off agent with a 403', async () => {
        await expect(fireSchedule('off', schedule('s'))).rejects.toMatchObject({ status: 403 })
        expect(state.runs).toHaveLength(0)
    })

    it('skips a managed-model run while the budget latch is armed, leaving the schedule due', async () => {
        armBudgetLatch()

        const err = await fireSchedule('on', schedule('latched')).catch(e => e)

        expect(err).toBeInstanceOf(HttpError)
        expect(err.status).toBe(402)
        expect(state.markFired).not.toHaveBeenCalled()
        expect(state.sent).toHaveLength(0)
        expect(state.runs).toHaveLength(0)
    })

    it('fires through the latch when asked to ignore it', async () => {
        armBudgetLatch()

        await fireSchedule('on', schedule('forced'), { ignoreBudgetLatch: true })

        expect(state.runs).toHaveLength(1)
    })

    it('still fires an agent on its own key while the latch is armed', async () => {
        armBudgetLatch()
        state.provider = 'openai'

        await fireSchedule('on', schedule('own-key'))

        expect(state.runs).toHaveLength(1)
        expect(state.runs[0].override).toEqual({ provider: 'openai', model: 'm' })
    })

    it('stamps the schedule, opens a schedule session, announces it and starts the run', async () => {
        const started = await fireSchedule('on', schedule('daily', { model: 'gpt-x' }))

        expect(state.markFired).toHaveBeenCalledWith('on', 'daily', expect.any(String))
        expect(state.sent).toEqual([
            { event: 'agent.session.created', kind: 'info', agentId: 'on', sessionId: started.sessionId, runId: null, message: 'Scheduled run: Name daily', title: 'Name daily', source: 'schedule' },
        ])
        expect(state.runs[0]).toMatchObject({ agentId: 'on', sessionId: started.sessionId, message: '<scheduled_run schedule="daily" name="Name daily">\ndo daily\n</scheduled_run>', override: { provider: 'rerun', model: 'gpt-x' }, trigger: { source: 'schedule', slug: 'daily', name: 'Name daily' } })
        expect(started.runId).toBe(state.runs[0].runId)
    })

    it('does not stamp the schedule when told not to', async () => {
        await fireSchedule('on', schedule('manual'), { markFired: false })

        expect(state.markFired).not.toHaveBeenCalled()
        expect(state.runs).toHaveLength(1)
    })

    it('hands back the run already in flight instead of starting a second one', async () => {
        const first = await fireSchedule('on', schedule('dedupe'))
        const second = await fireSchedule('on', schedule('dedupe'))

        expect(second).toEqual(first)
        expect(state.runs).toHaveLength(1)
        expect(state.markFired).toHaveBeenCalledTimes(1)
    })

    it('fires again once the previous run has settled, even on error', async () => {
        vi.spyOn(logger, 'error').mockImplementation(() => undefined as never)
        const first = await fireSchedule('on', schedule('again'))
        state.runs[0].finish({ kind: 'error', error: 'boom' })
        await flush()

        const second = await fireSchedule('on', schedule('again'))

        expect(second.runId).not.toBe(first.runId)
        expect(state.runs).toHaveLength(2)
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ schedule: 'again', err: 'boom' }), 'scheduled run failed')
    })

    it('does not collapse two calls racing before the first run has started', async () => {
        const [a, b] = await Promise.all([fireSchedule('on', schedule('race')), fireSchedule('on', schedule('race'))])

        // Looks wrong: the in-flight entry is only set after startHeadlessRun resolves, so concurrent callers both fire.
        expect(a.runId).not.toBe(b.runId)
        expect(state.runs).toHaveLength(2)
    })
})

describe('startScheduler', () => {
    it('ticks at once and then every 30 seconds until stopped', async () => {
        vi.useFakeTimers()
        state.agentIds = ['on']

        const stop = startScheduler()
        await vi.advanceTimersByTimeAsync(0)
        expect(state.sweep).toHaveBeenCalledTimes(1)
        expect(state.sweep).toHaveBeenCalledWith(['on'])

        await vi.advanceTimersByTimeAsync(30_000)
        expect(state.sweep).toHaveBeenCalledTimes(2)
        await vi.advanceTimersByTimeAsync(30_000)
        expect(state.sweep).toHaveBeenCalledTimes(3)

        stop()
        await vi.advanceTimersByTimeAsync(90_000)
        expect(state.sweep).toHaveBeenCalledTimes(3)
    })

    it('fires only the due schedules of enabled agents', async () => {
        vi.useFakeTimers()
        state.agentIds = ['on', 'off', 'missing']
        state.schedules = { on: [schedule('due-a'), schedule('not-due')], off: [schedule('due-off')] }
        state.due = new Set(['due-a', 'due-off'])

        const stop = startScheduler()
        await vi.advanceTimersByTimeAsync(0)
        stop()

        expect(state.runs.map(r => (r.trigger as { slug: string }).slug)).toEqual(['due-a'])
    })

    it('keeps ticking the other agents when one fails to list its schedules', async () => {
        vi.useFakeTimers()
        const errors = vi.spyOn(logger, 'error').mockImplementation(() => undefined as never)
        state.agents.second = { id: 'second', config: { enabled: true } }
        state.agentIds = ['on', 'second']
        state.schedules = { on: new Error('bad frontmatter'), second: [schedule('second-due')] }
        state.due = new Set(['second-due'])

        const stop = startScheduler()
        await vi.advanceTimersByTimeAsync(0)
        stop()

        expect(state.runs.map(r => r.agentId)).toEqual(['second'])
        expect(errors).toHaveBeenCalledWith(expect.objectContaining({ agent: 'on', err: 'Error: bad frontmatter' }), 'scheduler failed to load schedules')
    })

    it('logs a tick that cannot list the agents and tries again on the next one', async () => {
        vi.useFakeTimers()
        const errors = vi.spyOn(logger, 'error').mockImplementation(() => undefined as never)
        state.agentIds = new Error('disk gone')

        const stop = startScheduler()
        await vi.advanceTimersByTimeAsync(0)
        expect(errors).toHaveBeenCalledWith({ err: 'Error: disk gone' }, 'scheduler tick failed to list agents')
        expect(state.sweep).not.toHaveBeenCalled()

        state.agentIds = ['on']
        await vi.advanceTimersByTimeAsync(30_000)
        stop()
        expect(state.sweep).toHaveBeenCalledWith(['on'])
    })

    it('treats a budget skip as routine and a launch failure as an error', async () => {
        vi.useFakeTimers()
        const errors = vi.spyOn(logger, 'error').mockImplementation(() => undefined as never)
        const debug = vi.spyOn(logger, 'debug').mockImplementation(() => undefined as never)
        state.agentIds = ['on']
        state.schedules = { on: [schedule('skipped')] }
        state.due = new Set(['skipped'])
        armBudgetLatch()

        const stop = startScheduler()
        await vi.advanceTimersByTimeAsync(0)
        expect(debug).toHaveBeenCalledWith({ agent: 'on', schedule: 'skipped' }, 'scheduled run skipped: rerun budget latched')
        expect(errors).not.toHaveBeenCalled()

        clearBudgetLatch()
        state.markFired.mockRejectedValueOnce(new Error('read-only fs'))
        await vi.advanceTimersByTimeAsync(30_000)
        stop()
        expect(errors).toHaveBeenCalledWith({ agent: 'on', schedule: 'skipped', err: 'Error: read-only fs' }, 'scheduled run failed')
    })
})
