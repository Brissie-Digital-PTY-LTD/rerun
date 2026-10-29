import { task } from '@trigger.dev/sdk/v3'
import { stopAgentsOnEngine } from '@/app/api/_services/agent-activation.service'
import { taskLogger as logger, triggerTask } from '@/cloud/tasks'

export type SyncAgentActivationPayload = { agentIds: string[] }

// The engine half of a plan-driven deactivation. The webhook has already written
// `agents.disabled_at`, which is what gates every interactive path; stopping the schedules and
// flipping the engine config means reaching a box that may be asleep, and a webhook that waits for
// it times out. Retried hard: an agent left on its cron is an agent still spending on a plan that
// no longer covers it.
export const syncAgentActivationTask = task({
    id: 'sync-agent-activation',
    maxDuration: 300,
    retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 60000 },
    run: (payload: SyncAgentActivationPayload) => syncAgentActivationRun(payload),
})

export async function syncAgentActivationRun({ agentIds }: SyncAgentActivationPayload) {
    logger.log('agent deactivation starting', { count: agentIds.length })
    await stopAgentsOnEngine(agentIds)
    logger.log('agent deactivation done', { count: agentIds.length })
    return { agentIds }
}

// Fire-and-forget from the webhook: a Trigger outage must not turn a downgrade into a 500 and an
// endless Stripe retry, since the flag that gates access is already written.
export async function requestAgentActivationSync(agentIds: string[]): Promise<void> {
    if (agentIds.length === 0) return
    try {
        await triggerTask<typeof syncAgentActivationTask>('sync-agent-activation', { agentIds })
    } catch (err) {
        console.error('Failed to schedule an agent deactivation', err)
    }
}
