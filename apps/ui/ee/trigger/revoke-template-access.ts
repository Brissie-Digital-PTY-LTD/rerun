import { logger, task } from '@trigger.dev/sdk/v3'
import { pauseTemplateAgentSchedules } from '@/ee/services/template-revocation.service'

export type RevokeTemplateAccessPayload = { workspaceId: number; templateId: string }

// The engine half of a revocation. The webhook has already written `agents.disabled_at`, which is
// what actually gates access; pausing the schedules means reaching a box that may be asleep, and a
// webhook that waits for it times out. Retried hard: a schedule left running is an agent still
// spending on a template nobody is paying for any more.
export const revokeTemplateAccessTask = task({
    id: 'revoke-template-access',
    maxDuration: 300,
    retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 60000 },
    run: async ({ workspaceId, templateId }: RevokeTemplateAccessPayload) => {
        logger.log('template revocation starting', { workspaceId, templateId })
        await pauseTemplateAgentSchedules(workspaceId, templateId)
        logger.log('template revocation done', { workspaceId, templateId })
        return { workspaceId, templateId }
    },
})

// Fire-and-forget from the webhook: a Trigger outage must not turn a cancellation into a 500 and
// an endless Stripe retry, since the access flag is already written.
export async function requestTemplateRevocation(payload: RevokeTemplateAccessPayload): Promise<void> {
    try {
        await revokeTemplateAccessTask.trigger(payload)
    } catch (err) {
        console.error('Failed to schedule a template revocation', err)
    }
}
