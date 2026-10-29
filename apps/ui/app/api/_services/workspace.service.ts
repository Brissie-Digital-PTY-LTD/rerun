import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/app/api/database.types'
import { isSubscriptionEntitled } from '@/cloud/billing'
import { selectMany } from '@/supabase/supabase-helpers'
import type { WorkspaceSummary } from '@rerun/contracts'

type Client = SupabaseClient<Database>

// The workspaces the caller can switch to, as the web switcher lists them: every membership, the
// expert sandbox left out, oldest first. Read with the caller's own client, so RLS scopes it.
export async function listUserWorkspaces(supabase: Client, userId: string): Promise<WorkspaceSummary[]> {
    const { data: memberships, error: membershipsError } = await selectMany(supabase, 'workspace_members', ['workspace_id'] as const, { user_id: userId })
    if (membershipsError) throw membershipsError
    const ids = (memberships ?? []).map(m => m.workspace_id)
    if (ids.length === 0) return []

    const { data: workspaces, error } = await selectMany(supabase, 'workspaces', ['id', 'name', 'icon_url', 'plan', 'is_sandbox', 'subscription_status'] as const, { id: ids })
    if (error) throw error
    return (workspaces ?? [])
        .filter(w => !w.is_sandbox)
        .sort((a, b) => a.id - b.id)
        .map(w => ({ id: w.id, name: w.name, iconUrl: w.icon_url, plan: w.plan, subscribed: isSubscriptionEntitled(w.subscription_status) }))
}
