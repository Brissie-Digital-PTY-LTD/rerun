'use server'

import { accountLabel } from '@/lib/auth/placeholder-email'
import { requireWorkspaceContext, type WorkspaceContext } from '@/app/api/_auth/ownership'
import type { Database } from '@/app/api/database.types'
import { getAppOrigin } from '@/lib/app-origin'
import { isWorkspaceApiEntitled } from '@/cloud/billing'
import { apiKeyPrefix, generateApiKey, hashApiKey } from '@/lib/mcp/api-keys'
import { mcpAccountUrl } from '@/lib/mcp/connect'
import { selectAll, selectCount, selectMaybeSingle } from '@/supabase/supabase-helpers'

import type { ActionResult } from './space.actions'

// Every member of a workspace may issue a key: a key reaches exactly what the member already
// reaches through the UI, so gating it on the owner would only push people to share one key.
// What is gated is the subscription, trial included. A sandbox, which has no subscription at
// all, is entitled by nature: see `isWorkspaceApiEntitled`.

const MAX_ACTIVE_KEYS = 20
const MAX_NAME_LENGTH = 60

// key_hash stays out: nothing on the client has any use for it.
const API_KEY_COLUMNS = ['id', 'name', 'key_prefix', 'created_by', 'last_used_at', 'created_at'] as const

export type ApiKeyView = {
    id: string
    name: string
    keyPrefix: string
    createdBy: string | null
    lastUsedAt: string | null
    createdAt: string
}

// The key id comes from the client, so ownership is proven before anything is written: without
// this check a member could revoke another workspace's key by guessing its uuid.
async function assertKeyInWorkspace(ctx: WorkspaceContext, id: string): Promise<void> {
    const { data: key } = await selectMaybeSingle(ctx.supabase, 'api_keys', ['workspace_id'] as const, { id })
    if (!key || key.workspace_id !== ctx.workspace.id) throw new Error('Key not found')
}

export async function listApiKeysAction(): Promise<ActionResult<{ keys: ApiKeyView[]; mcpUrl: string; entitled: boolean }>> {
    try {
        const ctx = await requireWorkspaceContext()
        // A revoked key is dead and cannot come back, so it only adds noise here. The row stays in
        // the database for the admin view, which is where its history is still worth something.
        const { data } = await selectAll(
            ctx.supabase,
            'api_keys',
            API_KEY_COLUMNS,
            { workspace_id: ctx.workspace.id, revoked_at: { isNull: true } },
            { column: 'created_at', ascending: false },
        )

        const keys: ApiKeyView[] = (data ?? []).map(k => ({
            id: k.id,
            name: k.name,
            keyPrefix: k.key_prefix,
            createdBy: k.created_by,
            lastUsedAt: k.last_used_at,
            createdAt: k.created_at,
        }))

        // Resolved on the server: in dev each Conductor workspace runs on its own port, so a
        // constant would hand out a command pointing at another app, or at nothing.
        return { ok: true, keys, mcpUrl: mcpAccountUrl(await getAppOrigin()), entitled: isWorkspaceApiEntitled(ctx.workspace) }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to load API keys' }
    }
}

// The full key exists here and in the response, never again: the database only keeps its hash.
export async function createApiKeyAction(rawName: string): Promise<ActionResult<{ key: string }>> {
    try {
        const ctx = await requireWorkspaceContext()
        if (!isWorkspaceApiEntitled(ctx.workspace)) {
            return { ok: false, error: 'The Rerun API needs an active subscription. Start your subscription to create a key.' }
        }

        const name = rawName.trim()
        if (!name) return { ok: false, error: 'Give the key a name, so you can tell it apart later.' }
        if (name.length > MAX_NAME_LENGTH) return { ok: false, error: `Keep the name under ${MAX_NAME_LENGTH} characters.` }

        const { data: activeCount } = await selectCount(ctx.supabase, 'api_keys', { workspace_id: ctx.workspace.id, revoked_at: { isNull: true } })
        if ((activeCount ?? 0) >= MAX_ACTIVE_KEYS) {
            return { ok: false, error: `This workspace already has ${MAX_ACTIVE_KEYS} active keys. Revoke one to create another.` }
        }

        const key = generateApiKey()
        const { error } = await ctx.supabase.from('api_keys').insert<Database['public']['Tables']['api_keys']['Insert']>({
            workspace_id: ctx.workspace.id,
            name,
            key_prefix: apiKeyPrefix(key),
            key_hash: hashApiKey(key),
            created_by: accountLabel(ctx.authUser.email),
        })
        if (error) return { ok: false, error: error.message }

        return { ok: true, key }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to create the key' }
    }
}

export async function revokeApiKeyAction(id: string): Promise<ActionResult> {
    try {
        const ctx = await requireWorkspaceContext()
        await assertKeyInWorkspace(ctx, id)

        const { error } = await ctx.supabase.from('api_keys').update<Database['public']['Tables']['api_keys']['Update']>({ revoked_at: new Date().toISOString() }).eq('id', id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to revoke the key' }
    }
}
