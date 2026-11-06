import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/app/api/database.types'
import { selectAll } from '@/supabase/supabase-helpers'
import type { LifecycleCandidate, LifecycleSend } from './decide'
import type { LifecycleSequenceKey } from './sequences'

type LifecycleInsert = Database['public']['Tables']['lifecycle_emails']['Insert']

const SENT_COLUMNS = ['user_id', 'workspace_id', 'agent_id', 'sequence_key', 'sent_at'] as const

// A conflict means another tick, or the inline trial receipt, already sent this one. That is the
// unique index doing its job, not a failure.
const UNIQUE_VIOLATION = '23505'

export type SentIndex = {
    byUser: Map<string, LifecycleSend[]>
    byWorkspace: Map<number, LifecycleSend[]>
}

function toSend(row: { user_id: string; agent_id: string | null; sequence_key: string; sent_at: string }): LifecycleSend {
    return { sequenceKey: row.sequence_key as LifecycleSequenceKey, agentId: row.agent_id, sentAt: new Date(row.sent_at), recipientId: row.user_id }
}

/**
 * Everything already sent to these people, and everything already sent inside their workspaces. Both
 * are needed: the first is the daily cap, the second is what stops a workspace-scoped email going
 * out twice when ownership moved between the two sends.
 */
export async function loadSentIndex(supabase: SupabaseClient<Database>, userIds: string[], workspaceIds: number[]): Promise<SentIndex> {
    const index: SentIndex = { byUser: new Map(), byWorkspace: new Map() }
    if (userIds.length === 0) return index

    const [byUser, byWorkspace] = await Promise.all([
        selectAll(supabase, 'lifecycle_emails', SENT_COLUMNS, { user_id: userIds }, { column: 'sent_at', ascending: false }),
        workspaceIds.length ? selectAll(supabase, 'lifecycle_emails', SENT_COLUMNS, { workspace_id: workspaceIds }, { column: 'sent_at', ascending: false }) : Promise.resolve({ data: [], error: null }),
    ])

    for (const row of byUser.data ?? []) {
        const list = index.byUser.get(row.user_id) ?? []
        list.push(toSend(row))
        index.byUser.set(row.user_id, list)
    }
    for (const row of byWorkspace.data ?? []) {
        const list = index.byWorkspace.get(row.workspace_id) ?? []
        list.push(toSend(row))
        index.byWorkspace.set(row.workspace_id, list)
    }
    return index
}

export function sendsFor(index: SentIndex, userId: string, workspaceId: number): LifecycleSend[] {
    const own = index.byUser.get(userId) ?? []
    const workspace = (index.byWorkspace.get(workspaceId) ?? []).filter(send => send.recipientId !== userId)
    return [...own, ...workspace]
}

export type RecordOutcome = 'recorded' | 'duplicate' | 'failed'

export async function recordLifecycleEmail(
    supabase: SupabaseClient<Database>,
    candidate: Pick<LifecycleCandidate, 'sequenceKey' | 'userId' | 'workspaceId' | 'agentId'>,
    status: Database['public']['Enums']['lifecycle_email_status'],
    metadata?: Record<string, unknown>,
): Promise<RecordOutcome> {
    const { error } = await supabase.from('lifecycle_emails').insert<LifecycleInsert>({
        user_id: candidate.userId,
        workspace_id: candidate.workspaceId,
        sequence_key: candidate.sequenceKey,
        agent_id: candidate.agentId,
        status,
        metadata: (metadata ?? null) as unknown as LifecycleInsert['metadata'],
    })

    if (!error) return 'recorded'
    if (error.code === UNIQUE_VIOLATION) return 'duplicate'
    console.error('[lifecycle] failed to record send', error)
    return 'failed'
}
