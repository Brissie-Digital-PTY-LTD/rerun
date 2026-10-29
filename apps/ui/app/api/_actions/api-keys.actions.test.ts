import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hashApiKey } from '@/lib/mcp/api-keys'
import { fakeSupabase, writeMethodOf, type FakeSupabase, type SupabaseCall } from '@/test/supabase-fake'
vi.mock('@/cloud/billing', async importOriginal => ({ ...(await importOriginal<object>()), ...(await import('@/test/cloud-fakes')).CLOUD_ENTITLEMENTS }))

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn() }))

vi.mock('@/supabase/session/getServerSession', () => ({ getServerSession: mocks.getServerSession, getSessionWorkspace: mocks.getServerSession }))
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/app-origin', () => ({ getAppOrigin: async () => 'https://app.rerun.build' }))

const { createServiceRoleClient } = await import('@/supabase/serviceRole')
const { createApiKeyAction, revokeApiKeyAction } = await import('./api-keys.actions')

const WORKSPACE_ID = 7

function database(resolve: (table: string, calls: readonly SupabaseCall[]) => { data?: unknown; count?: number } | undefined = () => undefined): FakeSupabase {
    const db = fakeSupabase((table, calls) => (table === 'workspace_members' ? { data: { user_id: 'user-1' } } : resolve(table, calls)))
    vi.mocked(createServiceRoleClient).mockReturnValue(db.client)
    return db
}

function signedIn(workspace: { subscription_status: string | null; is_sandbox: boolean }) {
    mocks.getServerSession.mockResolvedValue({
        user: { id: 'user-1', workspace_id: WORKSPACE_ID },
        workspace: { id: WORKSPACE_ID, name: 'Acme', ...workspace },
        session: { id: 'user-1', email: 'me@acme.test' },
        workspaceRefused: false,
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    signedIn({ subscription_status: 'active', is_sandbox: false })
})

describe('createApiKeyAction', () => {
    it('refuses a workspace on trial, which is not entitled to the API', async () => {
        signedIn({ subscription_status: 'trialing', is_sandbox: false })
        const db = database()

        const result = await createApiKeyAction('CI')

        expect(result.ok).toBe(false)
        expect(db.writes('api_keys')).toHaveLength(0)
    })

    it('lets a sandbox create a key without a subscription', async () => {
        signedIn({ subscription_status: null, is_sandbox: true })
        database(() => ({ count: 0 }))

        await expect(createApiKeyAction('CI')).resolves.toMatchObject({ ok: true })
    })

    it('refuses a twenty-first active key', async () => {
        const db = database((table, calls) => (table === 'api_keys' && !writeMethodOf(calls) ? { count: 20 } : undefined))

        await expect(createApiKeyAction('CI')).resolves.toEqual({ ok: false, error: 'This workspace already has 20 active keys. Revoke one to create another.' })
        expect(db.writes('api_keys')).toHaveLength(0)
    })

    it('counts only the unrevoked keys of this workspace', async () => {
        const db = database(() => ({ count: 3 }))

        await createApiKeyAction('CI')

        const count = db.chainsOn('api_keys').find(chain => !writeMethodOf(chain))!
        expect(count.filter(call => call.method !== 'from' && call.method !== 'select').map(call => [call.method, ...call.args])).toEqual([
            ['eq', 'workspace_id', WORKSPACE_ID],
            ['is', 'revoked_at', null],
        ])
    })

    it('stores only the hash and the display prefix, and hands the raw key back once', async () => {
        const db = database(() => ({ count: 0 }))

        const result = await createApiKeyAction('  CI  ')
        if (!result.ok) throw new Error(result.error)

        const [write] = db.writes('api_keys')
        expect(write.payload).toEqual({ workspace_id: WORKSPACE_ID, name: 'CI', key_prefix: result.key.slice(0, 12), key_hash: hashApiKey(result.key), created_by: 'me@acme.test' })
        expect(JSON.stringify(write.payload)).not.toContain(result.key)
    })

    it('refuses an empty name and a name past sixty characters', async () => {
        database(() => ({ count: 0 }))

        await expect(createApiKeyAction('   ')).resolves.toMatchObject({ ok: false })
        await expect(createApiKeyAction('x'.repeat(61))).resolves.toEqual({ ok: false, error: 'Keep the name under 60 characters.' })
    })
})

describe('revokeApiKeyAction', () => {
    it('answers Key not found for a key of another workspace and writes nothing', async () => {
        const db = database(table => (table === 'api_keys' ? { data: { workspace_id: 99 } } : undefined))

        await expect(revokeApiKeyAction('key-1')).resolves.toEqual({ ok: false, error: 'Key not found' })
        expect(db.writes('api_keys')).toHaveLength(0)
    })

    it('answers Key not found for a key that does not exist', async () => {
        const db = database()

        await expect(revokeApiKeyAction('key-1')).resolves.toEqual({ ok: false, error: 'Key not found' })
        expect(db.writes('api_keys')).toHaveLength(0)
    })

    it('stamps revoked_at on a key of the workspace', async () => {
        const db = database((table, calls) => (table === 'api_keys' && !writeMethodOf(calls) ? { data: { workspace_id: WORKSPACE_ID } } : undefined))

        await expect(revokeApiKeyAction('key-1')).resolves.toEqual({ ok: true })
        const [write] = db.writes('api_keys')
        expect(write.payload).toEqual({ revoked_at: expect.any(String) })
        expect(write.filters.map(call => call.args)).toEqual([['id', 'key-1']])
    })
})
