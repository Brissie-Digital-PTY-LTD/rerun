import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeSupabase, type FakeSupabase } from '@/test/supabase-fake'

const mocks = vi.hoisted(() => ({
    getAdminEmail: vi.fn(),
    getServerSession: vi.fn(),
    createAgentShare: vi.fn(),
    installAgentShare: vi.fn(),
    revokeAgentShare: vi.fn(),
}))

vi.mock('@/lib/auth/admin', () => ({ getAdminEmail: mocks.getAdminEmail }))
vi.mock('@/supabase/session/getServerSession', () => ({ getServerSession: mocks.getServerSession, getSessionWorkspace: mocks.getServerSession }))
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/agents/share-create', () => ({ createAgentShare: mocks.createAgentShare, planAgentShare: vi.fn() }))
vi.mock('@/lib/agents/share-install', () => ({ installAgentShare: mocks.installAgentShare }))
vi.mock('@/lib/agents/share-read', () => ({ listWorkspaceShares: vi.fn(), readAgentShare: vi.fn(), revokeAgentShare: mocks.revokeAgentShare }))

const { createServiceRoleClient } = await import('@/supabase/serviceRole')
const { createAgentShareAction, installSharedAgentAction, revokeAgentShareAction } = await import('./agent-share.actions')

const WORKSPACE_ID = 7
const AGENT_ID = '11111111-1111-4111-8111-111111111111'
const SPACE_ID = '22222222-2222-4222-8222-222222222222'
const SHARE_ID = '33333333-3333-4333-8333-333333333333'

type Owners = { agentWorkspace?: number; spaceWorkspace?: number; subscriptionStatus?: string | null }

function database({ agentWorkspace = WORKSPACE_ID, spaceWorkspace = WORKSPACE_ID, subscriptionStatus = 'active' }: Owners = {}): FakeSupabase {
    const db = fakeSupabase(table => {
        if (table === 'workspace_members') return { data: { user_id: 'user-1' } }
        if (table === 'agents') return { data: { workspace_id: agentWorkspace, space_id: SPACE_ID, engine_agent_id: 'engine-1' } }
        if (table === 'spaces') return { data: { workspace_id: spaceWorkspace } }
        if (table === 'workspaces') return { data: { subscription_status: subscriptionStatus } }
        return undefined
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(db.client)
    return db
}

beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminEmail.mockResolvedValue(null)
    mocks.getServerSession.mockResolvedValue({
        user: { id: 'user-1', workspace_id: WORKSPACE_ID },
        workspace: { id: WORKSPACE_ID, name: 'Acme' },
        session: { id: 'user-1', email: 'me@acme.test' },
        workspaceRefused: false,
    })
    mocks.createAgentShare.mockResolvedValue({ url: 'https://app.rerun.build/s/tok', warnings: [], reused: false })
    mocks.installAgentShare.mockResolvedValue({ agentId: 'new-agent' })
})

describe('createAgentShareAction', () => {
    it('refuses an agent of another workspace without creating a share', async () => {
        database({ agentWorkspace: 99 })

        await expect(createAgentShareAction({ agentId: AGENT_ID, include: {} })).resolves.toEqual({ ok: false, error: 'Coworker not found' })
        expect(mocks.createAgentShare).not.toHaveBeenCalled()
    })

    it('creates the share for the caller workspace', async () => {
        database()

        await expect(createAgentShareAction({ agentId: AGENT_ID, include: { files: false } })).resolves.toEqual({ ok: true, url: 'https://app.rerun.build/s/tok', warnings: [], reused: false })
        expect(mocks.createAgentShare.mock.calls[0][1]).toEqual({ agentRowId: AGENT_ID, workspaceId: WORKSPACE_ID, userId: 'user-1', include: { memories: false, database: false, files: false } })
    })
})

describe('installSharedAgentAction', () => {
    it('refuses a Box of another workspace', async () => {
        database({ spaceWorkspace: 99 })

        await expect(installSharedAgentAction({ token: 'tok', spaceId: SPACE_ID })).resolves.toEqual({ ok: false, error: 'Space not found' })
        expect(mocks.installAgentShare).not.toHaveBeenCalled()
    })

    it('refuses a workspace with no active plan', async () => {
        database({ subscriptionStatus: 'canceled' })

        await expect(installSharedAgentAction({ token: 'tok', spaceId: SPACE_ID })).resolves.toEqual({ ok: false, error: 'This workspace has no active plan.' })
        expect(mocks.installAgentShare).not.toHaveBeenCalled()
    })

    it('lets an admin install without a plan', async () => {
        mocks.getAdminEmail.mockResolvedValue('admin@rerun.build')
        const db = database({ subscriptionStatus: null })

        await expect(installSharedAgentAction({ token: 'tok', spaceId: SPACE_ID })).resolves.toEqual({ ok: true, agentId: 'new-agent' })
        expect(db.chainsOn('workspaces')).toHaveLength(0)
    })

    it('installs on a trialing workspace, into the Box it was asked for', async () => {
        database({ subscriptionStatus: 'trialing' })

        await expect(installSharedAgentAction({ token: 'tok', spaceId: SPACE_ID, position: { col: 1, row: 2 } })).resolves.toEqual({ ok: true, agentId: 'new-agent' })
        expect(mocks.installAgentShare).toHaveBeenCalledWith(expect.anything(), 'tok', { workspaceId: WORKSPACE_ID, spaceId: SPACE_ID, position: { col: 1, row: 2 } })
    })
})

describe('revokeAgentShareAction', () => {
    it('scopes the revocation to the caller workspace', async () => {
        database()

        await expect(revokeAgentShareAction(SHARE_ID)).resolves.toEqual({ ok: true })
        expect(mocks.revokeAgentShare).toHaveBeenCalledWith(expect.anything(), SHARE_ID, WORKSPACE_ID)
    })

    it('refuses an id that is not a uuid', async () => {
        database()

        await expect(revokeAgentShareAction('nope')).resolves.toMatchObject({ ok: false })
        expect(mocks.revokeAgentShare).not.toHaveBeenCalled()
    })
})
