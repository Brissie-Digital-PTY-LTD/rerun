import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeSupabase, writeMethodOf, type FakeSupabase } from '@/test/supabase-fake'
vi.mock('@/cloud/billing', async importOriginal => ({ ...(await importOriginal<object>()), ...(await import('@/test/cloud-fakes')).CLOUD_ENTITLEMENTS }))

vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))

const { createServiceRoleClient } = await import('@/supabase/serviceRole')
const { authenticateApiKey, generateApiKey, hashApiKey } = await import('./api-keys')

let db: FakeSupabase
let keyRow: unknown
let workspaceRow: unknown

beforeEach(() => {
    keyRow = { id: 'k1', workspace_id: 5, revoked_at: null, created_by: 'u1' }
    workspaceRow = { subscription_status: 'active', is_sandbox: false }
    db = fakeSupabase((table, calls) => {
        if (writeMethodOf(calls)) return undefined
        if (table === 'api_keys') return { data: keyRow }
        if (table === 'workspaces') return { data: workspaceRow }
        return undefined
    })
    vi.mocked(createServiceRoleClient).mockReset().mockReturnValue(db.client)
})

describe('authenticateApiKey', () => {
    it('answers the workspace of a live key, and the member it acts for', async () => {
        const key = generateApiKey()
        await expect(authenticateApiKey(key)).resolves.toEqual({ keyId: 'k1', workspaceId: 5, createdBy: 'u1' })
    })

    it('looks the key up by its hash, never by the raw key', async () => {
        const key = generateApiKey()
        await authenticateApiKey(key)
        const lookup = db.chainsOn('api_keys')[0]
        const filters = lookup.filter(call => call.method === 'eq').map(call => call.args)
        expect(filters).toEqual([['key_hash', hashApiKey(key)]])
        expect(JSON.stringify(lookup)).not.toContain(key)
    })

    it('refuses a token without the rk_ prefix without touching the database', async () => {
        await expect(authenticateApiKey('sk_live_whatever')).resolves.toBeNull()
        await expect(authenticateApiKey('')).resolves.toBeNull()
        expect(db.calls).toHaveLength(0)
    })

    it('refuses a revoked key', async () => {
        keyRow = { id: 'k1', workspace_id: 5, revoked_at: '2026-09-01T00:00:00Z' }
        await expect(authenticateApiKey(generateApiKey())).resolves.toBeNull()
        expect(db.writes('api_keys')).toEqual([])
    })

    it('refuses an unknown key', async () => {
        keyRow = null
        await expect(authenticateApiKey(generateApiKey())).resolves.toBeNull()
    })

    it('marks the key as used on its own row', async () => {
        await authenticateApiKey(generateApiKey())
        const [write] = db.writes('api_keys')
        expect(write.method).toBe('update')
        expect(write.payload).toEqual({ last_used_at: expect.any(String) })
        expect(write.filters.map(call => call.args)).toEqual([['id', 'k1']])
    })

    it('stamps the activity of a sandbox, at most once an hour', async () => {
        await authenticateApiKey(generateApiKey())
        await Promise.resolve()
        const [write] = db.writes('workspaces')
        expect(write.payload).toEqual({ last_active_at: expect.any(String) })
        expect(write.filters.map(call => call.args)).toEqual([['id', 5], ['is_sandbox', true], [expect.stringMatching(/^last_active_at\.is\.null,last_active_at\.lt\./)]])
    })

    it('still authenticates when the last_used_at update fails', async () => {
        const rejectingUpdate = { eq: () => Promise.reject(new Error('write failed')) }
        const client = {
            from: (table: string) => {
                const builder = db.client.from(table as 'api_keys')
                return new Proxy(builder, { get: (target, prop) => (prop === 'update' && table === 'api_keys' ? () => rejectingUpdate : Reflect.get(target, prop)) })
            },
        }
        vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as typeof db.client)
        await expect(authenticateApiKey(generateApiKey())).resolves.toEqual({ keyId: 'k1', workspaceId: 5, createdBy: 'u1' })
    })

    it('refuses a key once the workspace plan is cancelled', async () => {
        workspaceRow = { subscription_status: 'canceled', is_sandbox: false }
        await expect(authenticateApiKey(generateApiKey())).resolves.toBeNull()
        const lookup = db.chainsOn('workspaces')[0]
        expect(lookup.filter(call => call.method === 'eq').map(call => call.args)).toEqual([['id', 5]])
        expect(db.writes('api_keys')).toEqual([])
    })

    it('refuses a key on a workspace still in its trial', async () => {
        workspaceRow = { subscription_status: 'trialing', is_sandbox: false }
        await expect(authenticateApiKey(generateApiKey())).resolves.toBeNull()
    })

    it('refuses a key whose workspace is gone', async () => {
        workspaceRow = null
        await expect(authenticateApiKey(generateApiKey())).resolves.toBeNull()
    })

    it('keeps accepting the key of a sandbox, whatever its plan says', async () => {
        workspaceRow = { subscription_status: 'canceled', is_sandbox: true }
        await expect(authenticateApiKey(generateApiKey())).resolves.toEqual({ keyId: 'k1', workspaceId: 5, createdBy: 'u1' })
    })
})
