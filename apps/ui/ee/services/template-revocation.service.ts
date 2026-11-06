import type { Database } from '@/app/api/database.types'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectMany } from '@/supabase/supabase-helpers'
import { pauseAgentSchedules, resumeAgentSchedules } from '@/app/api/_services/agent.service'

// A recurring template stops being owned the moment its subscription ends, and what it installed
// has to stop with it.
//
// The split matters: the DB writes here are synchronous because they are what the library and the
// install and chat gates read, while reaching the engine to pause schedules can hang on a box that
// is asleep. The webhook does the first and hands the second to a Trigger task.

type AgentUpdate = Database['public']['Tables']['agents']['Update']
type PurchaseUpdate = Database['public']['Tables']['template_purchases']['Update']

export function revocationReason(templateId: string): string {
    return `template_revoked:${templateId}`
}

// Everything the webhook must have done before it answers Stripe: one purchase row and one bulk
// flag, no engine call. The status says why access ended, which the library turns into either
// "Resubscribe" or a plain "Buy".
export async function revokeTemplateAccess(workspaceId: number, templateId: string, status: 'canceled' | 'refunded' = 'canceled'): Promise<void> {
    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    await supabase
        .from('template_purchases')
        .update<PurchaseUpdate>({ status, revoked_at: now, updated_at: now })
        .eq('workspace_id', workspaceId)
        .eq('template_id', templateId)

    await supabase
        .from('agents')
        .update<AgentUpdate>({ disabled_at: now, disabled_reason: revocationReason(templateId) })
        .eq('workspace_id', workspaceId)
        .eq('template_id', templateId)
        .is('disabled_at', null)
}

// The Trigger task's job: the agents are already flagged, this is what actually stops them.
export async function pauseTemplateAgentSchedules(workspaceId: number, templateId: string): Promise<void> {
    const supabase = createServiceRoleClient()
    const { data: agents } = await selectMany(supabase, 'agents', ['id'] as const, {
        workspace_id: workspaceId,
        template_id: templateId,
        disabled_reason: revocationReason(templateId),
    })

    for (const agent of agents ?? []) {
        await pauseAgentSchedules(agent.id)
    }
}

// Buying again gives the agents back rather than a second copy of them: the ones a previous
// revocation disabled are exactly the ones restored here. Engine failures are logged rather than
// raised, because the buyer's entitlement must land whatever the state of their box.
export async function reenableAgentsForTemplate(workspaceId: number, templateId: string): Promise<void> {
    const supabase = createServiceRoleClient()
    const reason = revocationReason(templateId)

    const { data: agents } = await selectMany(supabase, 'agents', ['id'] as const, { workspace_id: workspaceId, template_id: templateId, disabled_reason: reason })
    if (!agents?.length) return

    await supabase
        .from('agents')
        .update<AgentUpdate>({ disabled_at: null, disabled_reason: null })
        .eq('workspace_id', workspaceId)
        .eq('template_id', templateId)
        .eq('disabled_reason', reason)

    for (const agent of agents) {
        try {
            await resumeAgentSchedules(agent.id)
        } catch (err) {
            console.error('[templates] failed to resume schedules after a re-purchase', agent.id, err)
        }
    }
}
