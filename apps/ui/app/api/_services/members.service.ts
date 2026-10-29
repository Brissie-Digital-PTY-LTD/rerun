import type { MemberProfile } from '@rerun/contracts'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { WorkspaceContext } from '@/app/api/_auth/ownership'
import type { Database } from '@/app/api/database.types'
import { displayNameOf, readProfile } from '@/app/api/_services/me.service'
import { accountLabel } from '@/lib/auth/placeholder-email'
import { selectAll } from '@/supabase/supabase-helpers'

type MemberIdentity = { email: string | null; name: string | null; avatarUrl: string | null }

export async function resolveMemberIdentities(supabase: SupabaseClient<Database>, userIds: string[]): Promise<Map<string, MemberIdentity>> {
    const identities = new Map<string, MemberIdentity>()
    await Promise.all(
        userIds.map(async id => {
            const { data } = await supabase.auth.admin.getUserById(id)
            if (!data.user) return
            identities.set(id, { email: accountLabel(data.user.email?.toLowerCase()), name: displayNameOf(data.user), avatarUrl: readProfile(data.user).avatarUrl })
        }),
    )
    return identities
}

// Who signs a message in a conversation: every member of the workspace, with the name and photo of
// their auth record.
export async function listMemberProfiles({ workspace, supabase }: WorkspaceContext): Promise<MemberProfile[]> {
    const { data: memberRows } = await selectAll(supabase, 'workspace_members', ['user_id'] as const, { workspace_id: workspace.id }, { column: 'created_at', ascending: true })
    const ids = (memberRows ?? []).map(m => m.user_id)
    const identities = await resolveMemberIdentities(supabase, ids)
    return ids.map(id => ({ id, name: identities.get(id)?.name ?? null, avatarUrl: identities.get(id)?.avatarUrl ?? null }))
}
