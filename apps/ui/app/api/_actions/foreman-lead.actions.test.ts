import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeSupabase, type FakeSupabase, type SupabaseCall } from '@/test/supabase-fake'

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn(), startAgentSetup: vi.fn() }))

vi.mock('@/supabase/session/getServerSession', () => ({ getServerSession: mocks.getServerSession, getSessionWorkspace: mocks.getServerSession }))
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/foreman/setup-handoff', () => ({ startAgentSetup: mocks.startAgentSetup }))
vi.mock('@/lib/foreman/build-team', () => ({ PLAIN_KICKOFF: 'kickoff' }))

const { createServiceRoleClient } = await import('@/supabase/serviceRole')
const { readLeadInstallAction, startLeadSetupAction } = await import('./foreman-lead.actions')

const WORKSPACE_ID = 7

function eqsOf(calls: readonly SupabaseCall[]): Record<string, unknown> {
    return Object.fromEntries(calls.filter(call => call.method === 'eq').map(call => call.args))
}

function database(agentWorkspaceId: number): FakeSupabase {
    return fakeSupabase((table, calls) => {
        if (table === 'workspace_members') return { data: { user_id: 'user-1' } }
        if (table === 'agents') return { data: { workspace_id: agentWorkspaceId, space_id: 'space-1', engine_agent_id: 'engine-1' } }
        if (table === 'sessions' && eqsOf(calls).agent_id === 'agent-1') return { data: [{ id: 'conversation-1' }] }
        return undefined
    })
}

let db: FakeSupabase

beforeEach(() => {
    vi.clearAllMocks()
    mocks.getServerSession.mockResolvedValue({
        user: { id: 'user-1', workspace_id: WORKSPACE_ID },
        workspace: { id: WORKSPACE_ID, name: 'Acme' },
        session: { id: 'user-1', email: 'me@acme.test' },
        workspaceRefused: false,
    })
})

describe('readLeadInstallAction', () => {
    it('names the conversation of a lead that already started', async () => {
        db = database(WORKSPACE_ID)
        vi.mocked(createServiceRoleClient).mockReturnValue(db.client)

        await expect(readLeadInstallAction('agent-1')).resolves.toEqual({ conversationId: 'conversation-1' })
    })

    it('reads a lead without a conversation as not started', async () => {
        db = fakeSupabase(table => {
            if (table === 'workspace_members') return { data: { user_id: 'user-1' } }
            if (table === 'agents') return { data: { workspace_id: WORKSPACE_ID, space_id: 'space-1', engine_agent_id: 'engine-1' } }
            if (table === 'sessions') return { data: [] }
            return undefined
        })
        vi.mocked(createServiceRoleClient).mockReturnValue(db.client)

        await expect(readLeadInstallAction('agent-1')).resolves.toEqual({ conversationId: null })
    })

    it('reads an agent from another workspace as not started, without reading its conversations', async () => {
        db = database(99)
        vi.mocked(createServiceRoleClient).mockReturnValue(db.client)

        await expect(readLeadInstallAction('agent-1')).resolves.toEqual({ conversationId: null })
        expect(db.chainsOn('sessions')).toHaveLength(0)
    })
})

describe('startLeadSetupAction', () => {
    it('reopens the conversation the lead already started instead of a second install', async () => {
        db = database(WORKSPACE_ID)
        vi.mocked(createServiceRoleClient).mockReturnValue(db.client)

        await expect(startLeadSetupAction('agent-1')).resolves.toEqual({ ok: true, conversationId: 'conversation-1', runId: null })
        expect(mocks.startAgentSetup).not.toHaveBeenCalled()
    })

    it('refuses an agent from another workspace without reading its conversations', async () => {
        db = database(99)
        vi.mocked(createServiceRoleClient).mockReturnValue(db.client)

        const result = await startLeadSetupAction('agent-1')

        expect(result.ok).toBe(false)
        expect(result).not.toHaveProperty('conversationId')
        expect(db.chainsOn('sessions')).toHaveLength(0)
        expect(mocks.startAgentSetup).not.toHaveBeenCalled()
    })

    it('starts the install when the lead has no conversation yet', async () => {
        db = fakeSupabase(table => {
            if (table === 'workspace_members') return { data: { user_id: 'user-1' } }
            if (table === 'agents') return { data: { workspace_id: WORKSPACE_ID, space_id: 'space-1', engine_agent_id: 'engine-1' } }
            if (table === 'sessions') return { data: [] }
            return undefined
        })
        vi.mocked(createServiceRoleClient).mockReturnValue(db.client)
        mocks.startAgentSetup.mockResolvedValue({ agents: [{ agentId: 'agent-1', started: true, conversationId: 'conversation-2', runId: 'run-1' }] })

        await expect(startLeadSetupAction('agent-1')).resolves.toEqual({ ok: true, conversationId: 'conversation-2', runId: 'run-1' })
        expect(mocks.startAgentSetup.mock.calls[0][1]).toEqual({ agents: [{ agentId: 'agent-1', message: 'kickoff' }] })
    })

    it('reports an agent without a free slot as inactive', async () => {
        db = fakeSupabase(table => {
            if (table === 'workspace_members') return { data: { user_id: 'user-1' } }
            if (table === 'agents') return { data: { workspace_id: WORKSPACE_ID, space_id: 'space-1', engine_agent_id: 'engine-1' } }
            if (table === 'sessions') return { data: [] }
            return undefined
        })
        vi.mocked(createServiceRoleClient).mockReturnValue(db.client)
        mocks.startAgentSetup.mockResolvedValue({ agents: [{ agentId: 'agent-1', started: false, inactive: true }] })

        await expect(startLeadSetupAction('agent-1')).resolves.toMatchObject({ ok: false, inactive: true })
    })
})
