import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeDb, getAgent } from '@/lib/engine/client'
import { hashApiKey } from '@/lib/mcp/api-keys'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { fakeSupabase, type FakeSupabase, type SupabaseCall } from '@/test/supabase-fake'

import { POST } from './route'

vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/engine/client')
vi.mock('@/app/api/_services/workspace-engine.service', () => ({
    findWorkspaceEngine: vi.fn(),
    getConnectionForAgent: vi.fn(),
    getWorkspaceConnection: vi.fn().mockResolvedValue({ baseUrl: 'https://engine.test', apiKey: 'engine-key' }),
}))
vi.mock('@/app/api/_services/agent.service', () => ({ changeAgentHandle: vi.fn(), createAgent: vi.fn(), deleteAgent: vi.fn(), moveAgentToBox: vi.fn(), renameAgent: vi.fn() }))
vi.mock('@/app/api/_services/agent-setup.service', () => ({ installServiceSlugs: vi.fn() }))
vi.mock('@/app/api/_services/services.service', () => ({ listCatalogServices: vi.fn(), listInstalledServices: vi.fn(), searchCatalogServices: vi.fn(), uninstallService: vi.fn() }))
vi.mock('@/app/api/_services/mcp-shares.service', () => ({ dispatchShareTool: vi.fn() }))

const WORKSPACE_ID = 7
const FOREIGN_WORKSPACE_ID = 99
const LIVE_KEY = 'rk_live-key'
const REVOKED_KEY = 'rk_revoked-key'

const API_KEYS: Record<string, { id: string; workspace_id: number; revoked_at: string | null }> = {
    [hashApiKey(LIVE_KEY)]: { id: 'key-1', workspace_id: WORKSPACE_ID, revoked_at: null },
    [hashApiKey(REVOKED_KEY)]: { id: 'key-2', workspace_id: WORKSPACE_ID, revoked_at: '2026-09-01T00:00:00Z' },
}

const AGENTS: Record<string, { workspace_id: number }> = {
    'agent-foreign': { workspace_id: FOREIGN_WORKSPACE_ID },
}

const SPACES: Record<string, { workspace_id: number }> = {
    'box-foreign': { workspace_id: FOREIGN_WORKSPACE_ID },
}

function eqValue(calls: readonly SupabaseCall[], column: string): unknown {
    return calls.find(call => call.method === 'eq' && call.args[0] === column)?.args[1]
}

function resolveRow(table: string, calls: readonly SupabaseCall[]) {
    if (table === 'api_keys') return { data: API_KEYS[eqValue(calls, 'key_hash') as string] ?? null }
    if (table === 'agents') {
        const row = AGENTS[eqValue(calls, 'id') as string]
        return { data: row ? { ...row, engine_agent_id: 'engine-agent', template_id: null, disabled_at: null, disabled_reason: null, workspaces: { subscription_status: 'active', is_sandbox: false } } : null }
    }
    if (table === 'spaces') return { data: SPACES[eqValue(calls, 'id') as string] ?? null }
    if (table === 'workspaces') return { data: { subscription_status: 'active', is_sandbox: false } }
    return undefined
}

function mcpRequest(token: string | null, body: unknown) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token !== null) headers.authorization = `Bearer ${token}`
    return new Request('https://rerun.test/api/mcp/account', { method: 'POST', headers, body: JSON.stringify(body) })
}

function toolCall(name: string, args: Record<string, unknown>) {
    return { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }
}

async function callTool(name: string, args: Record<string, unknown>) {
    const response = await POST(mcpRequest(LIVE_KEY, toolCall(name, args)))
    return (await response.json()) as { result: { isError?: boolean; content: { text: string }[] } }
}

describe('POST /api/mcp/account', () => {
    let db: FakeSupabase

    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        db = fakeSupabase(resolveRow)
        vi.mocked(createServiceRoleClient).mockReturnValue(db.client)
    })

    it('refuses a request without a key', async () => {
        const response = await POST(mcpRequest(null, toolCall('list_agents', {})))

        expect(response.status).toBe(401)
    })

    it('refuses an sk_ key without looking it up', async () => {
        const response = await POST(mcpRequest('sk_live_whatever', toolCall('list_agents', {})))

        expect(response.status).toBe(401)
        expect(db.calls).toHaveLength(0)
    })

    it('refuses a key it does not know', async () => {
        const response = await POST(mcpRequest('rk_unknown', toolCall('list_agents', {})))

        expect(response.status).toBe(401)
    })

    it('refuses a revoked key', async () => {
        const response = await POST(mcpRequest(REVOKED_KEY, toolCall('list_agents', {})))

        expect(response.status).toBe(401)
        expect(eqValue(db.chainsOn('api_keys')[0], 'key_hash')).toBe(hashApiKey(REVOKED_KEY))
        expect(db.writes('api_keys')).toEqual([])
    })

    it('scopes a call to the workspace of the key, not one named in the arguments', async () => {
        const response = await POST(mcpRequest(LIVE_KEY, toolCall('list_agents', { workspaceId: FOREIGN_WORKSPACE_ID })))

        expect(response.status).toBe(200)
        expect(eqValue(db.chainsOn('agents')[0], 'workspace_id')).toBe(WORKSPACE_ID)
    })

    it('answers get_agent on an agent of another workspace with a tool error', async () => {
        const { result } = await callTool('get_agent', { agentId: 'agent-foreign' })

        expect(result.isError).toBe(true)
        expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Coworker not found' })
        expect(getAgent).not.toHaveBeenCalled()
    })

    it('answers db_execute on an agent of another workspace with a tool error', async () => {
        const { result } = await callTool('db_execute', { agentId: 'agent-foreign', sql: 'DELETE FROM notes' })

        expect(result.isError).toBe(true)
        expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Coworker not found' })
        expect(executeDb).not.toHaveBeenCalled()
    })

    it('answers space_db_execute on a Box of another workspace with a tool error', async () => {
        const { result } = await callTool('space_db_execute', { spaceId: 'box-foreign', sql: 'DROP TABLE leads' })

        expect(result.isError).toBe(true)
        expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Box not found' })
        expect(executeDb).not.toHaveBeenCalled()
    })

    it('answers space_db_execute on a Box that does not exist with the same tool error', async () => {
        const { result } = await callTool('space_db_execute', { spaceId: 'box-missing', sql: 'DROP TABLE leads' })

        expect(result.isError).toBe(true)
        expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Box not found' })
        expect(executeDb).not.toHaveBeenCalled()
    })
})
