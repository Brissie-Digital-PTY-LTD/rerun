import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FakeSupabase } from '@/test/supabase-fake'

const actions = vi.hoisted(() => ({
    createAgentWithSetupAction: vi.fn(),
    installTemplateAction: vi.fn(),
    installSharedAgentAction: vi.fn(),
    duplicateAgentAction: vi.fn(),
}))

vi.mock('@/app/api/_actions/agent.actions', () => ({ deleteAgentAction: vi.fn(), duplicateAgentAction: actions.duplicateAgentAction, moveAgentAction: vi.fn(), renameAgentAction: vi.fn() }))
vi.mock('@/app/api/_actions/chat.actions', () => ({ startKickoffAction: vi.fn() }))
vi.mock('@/app/api/_actions/services.actions', () => ({ createAgentWithSetupAction: actions.createAgentWithSetupAction }))
vi.mock('@/app/api/_actions/session.actions', () => ({ fetchSessionActiveRun: vi.fn() }))
vi.mock('@/app/api/_actions/space.actions', () => ({ claimSpaceAction: vi.fn(), deleteSpaceAction: vi.fn(), renameSpaceAction: vi.fn() }))
vi.mock('@/app/api/_actions/agent-share.actions', () => ({ installSharedAgentAction: actions.installSharedAgentAction }))
vi.mock('@/app/api/_actions/template.actions', () => ({ installTemplateAction: actions.installTemplateAction }))
vi.mock('@/lib/confetti', () => ({ fireRerunConfetti: vi.fn() }))
vi.mock('@/lib/templates/install-feedback', () => ({ reportDuplicate: vi.fn(), reportInstall: vi.fn(), reportShareInstall: vi.fn() }))
vi.mock('@rerun/analytics/client', () => ({ track: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }))
// The store builds its client once, at import: the fake lives here so a test can read its writes
// and make a table refuse them.
const db = vi.hoisted(() => ({ fake: undefined as unknown as FakeSupabase, refusing: new Set<string>() }))
vi.mock('@/supabase/client', async () => {
    const { fakeSupabase } = await import('@/test/supabase-fake')
    db.fake = fakeSupabase(table => (db.refusing.has(table) ? { error: { message: 'refused' } } : undefined))
    return { createClient: () => db.fake.client }
})

import { UNPLACED_COL } from '@/lib/board/iso'
import type { IsoAgent, SpacePublic } from '@/lib/board/types'
import { toast } from 'sonner'
import { type PlacementQueue, placementLabel, useBoardStore } from './board.store'

const INITIAL = useBoardStore.getState()

const space = (id: string, colStart: number, colEnd: number): SpacePublic => ({ id, workspace_id: 7, name: id, col_start: colStart, row_start: 0, col_end: colEnd, row_end: 9, created_at: '' })

const agent = (id: string, spaceId: string, col: number, row: number): IsoAgent => ({ id, name: id, handle: null, description: null, templateId: null, status: 'idle', position: { col, row }, workspaceId: 7, spaceId, disabledAt: null, disabledReason: null })

beforeEach(() => {
    vi.clearAllMocks()
    useBoardStore.setState(INITIAL, true)
    db.refusing.clear()
    db.fake.calls.length = 0
    db.fake.chains.length = 0
})

function beginTemplate(agentNames = ['Scout', 'Writer', 'Closer']) {
    useBoardStore.getState().beginTemplatePlacement({ slug: 'crm-kit', title: 'CRM kit', agentNames })
}

describe('placementLabel', () => {
    const queue = (labels: string[], placed: number): PlacementQueue => ({ source: { kind: 'template', slug: 's', title: 't' }, labels, placed: Array.from({ length: placed }, () => ({ col: 0, row: 0 })), spaceId: null, installing: false })

    it('names the next tile to place', () => {
        expect(placementLabel(queue(['A', 'B'], 0))).toBe('A')
        expect(placementLabel(queue(['A', 'B'], 1))).toBe('B')
    })

    it('keeps the last name once every tile is placed, and is empty without labels', () => {
        expect(placementLabel(queue(['A', 'B'], 2))).toBe('B')
        expect(placementLabel(queue([], 0))).toBe('')
    })
})

describe('pushPlacement', () => {
    it('does nothing without a placement in progress', () => {
        expect(useBoardStore.getState().pushPlacement({ col: 0, row: 0 }, 's1')).toBeNull()
    })

    it('queues each drop and reports done on the last one, locking the queue while it installs', () => {
        beginTemplate(['Scout', 'Writer'])
        const store = useBoardStore.getState()
        expect(store.pushPlacement({ col: 0, row: 0 }, 's1')).toEqual({ positions: [{ col: 0, row: 0 }], done: false })
        expect(store.pushPlacement({ col: 2, row: 0 }, 's1')).toEqual({ positions: [{ col: 0, row: 0 }, { col: 2, row: 0 }], done: true })
        expect(useBoardStore.getState().placement).toMatchObject({ installing: true, spaceId: 's1' })
        expect(store.pushPlacement({ col: 4, row: 0 }, 's1')).toBeNull()
        expect(useBoardStore.getState().placement?.placed).toHaveLength(2)
    })

    it('keeps a template inside the space of its first drop', () => {
        beginTemplate()
        const store = useBoardStore.getState()
        store.pushPlacement({ col: 0, row: 0 }, 's1')
        expect(store.pushPlacement({ col: 20, row: 0 }, 's2')).toBeNull()
        expect(useBoardStore.getState().placement?.placed).toHaveLength(1)
    })

    it('accepts a drop with no space, as on the onboarding placeholder, without losing the locked one', () => {
        beginTemplate()
        const store = useBoardStore.getState()
        store.pushPlacement({ col: 0, row: 0 }, 's1')
        expect(store.pushPlacement({ col: 2, row: 0 }, null)).toMatchObject({ done: false })
        expect(useBoardStore.getState().placement?.spaceId).toBe('s1')
    })

    it('is done on the first drop of a single agent', () => {
        useBoardStore.getState().beginAgentPlacement({ name: 'Scout', serviceSlugs: [] })
        expect(useBoardStore.getState().pushPlacement({ col: 0, row: 0 }, null)).toMatchObject({ done: true })
    })
})

describe('beginning a placement', () => {
    it('clears the selection and names a duplicate as a copy', () => {
        useBoardStore.setState({ selectedAgentId: 'a1', selectedSpaceId: 's1' })
        useBoardStore.getState().beginAgentDuplicatePlacement({ agentId: 'a1', agentName: 'Scout' })
        const state = useBoardStore.getState()
        expect(state).toMatchObject({ selectedAgentId: null, selectedSpaceId: null })
        expect(state.placement?.labels).toHaveLength(1)
        expect(state.placement?.labels[0]).not.toBe('Scout')
    })
})

describe('confirmPlacement', () => {
    it('ignores a drop outside every space', () => {
        useBoardStore.setState({ spaces: [space('s1', 0, 9)] })
        beginTemplate(['Scout'])
        useBoardStore.getState().confirmPlacement({ col: 30, row: 0 })
        expect(useBoardStore.getState().placement?.placed).toEqual([])
    })

    it('installs the template in the space under the last tile, then clears the queue', async () => {
        actions.installTemplateAction.mockResolvedValue({ ok: true, imported: 2, failed: [], agentIds: [] })
        useBoardStore.setState({ spaces: [space('s1', 0, 9), space('s2', 10, 19)] })
        beginTemplate(['Scout', 'Writer'])
        useBoardStore.getState().confirmPlacement({ col: 0, row: 0 })
        expect(actions.installTemplateAction).not.toHaveBeenCalled()
        useBoardStore.getState().confirmPlacement({ col: 3, row: 0 })
        await vi.waitFor(() => expect(useBoardStore.getState().placement).toBeNull())
        expect(actions.installTemplateAction).toHaveBeenCalledWith({ slug: 'crm-kit', spaceId: 's1', positions: [{ col: 0, row: 0 }, { col: 3, row: 0 }] })
    })

    it('creates a described agent with its apps in the space under the tile', async () => {
        actions.createAgentWithSetupAction.mockResolvedValue({ ok: true, agentId: 'a1', active: true, checklist: [] })
        useBoardStore.setState({ spaces: [space('s1', 0, 9)] })
        useBoardStore.getState().beginAgentPlacement({ name: 'Reply Sorter', serviceSlugs: ['lemlist', 'slack'], kickoff: 'Sort every Lemlist reply' })
        useBoardStore.getState().confirmPlacement({ col: 2, row: 1 })
        await vi.waitFor(() => expect(useBoardStore.getState().placement).toBeNull())
        expect(actions.createAgentWithSetupAction).toHaveBeenCalledWith(expect.objectContaining({ name: 'Reply Sorter', serviceSlugs: ['lemlist', 'slack'], spaceId: 's1', col: 2, row: 1 }))
        expect(useBoardStore.getState().selectedAgentId).toBe('a1')
    })

    it('clears the queue even when the install throws', async () => {
        actions.installTemplateAction.mockRejectedValue(new Error('timeout'))
        useBoardStore.setState({ spaces: [space('s1', 0, 9)] })
        beginTemplate(['Scout'])
        useBoardStore.getState().confirmPlacement({ col: 0, row: 0 })
        await vi.waitFor(() => expect(useBoardStore.getState().placement).toBeNull())
    })
})

describe('cancelPlacement', () => {
    it('throws the whole queue away, nothing having been created', () => {
        beginTemplate()
        useBoardStore.getState().pushPlacement({ col: 0, row: 0 }, 's1')
        useBoardStore.getState().cancelPlacement()
        expect(useBoardStore.getState().placement).toBeNull()
        expect(actions.installTemplateAction).not.toHaveBeenCalled()
    })
})

describe('moveSpace', () => {
    const MOVED = { col_start: 0, row_start: 20, col_end: 7, row_end: 29 }

    beforeEach(() => {
        useBoardStore.setState({
            spaces: [space('s1', 0, 7), space('s2', 9, 16)],
            agents: [agent('carried', 's1', 1, 1), agent('unplaced', 's1', UNPLACED_COL, 0), agent('neighbour', 's2', 10, 1)],
        })
    })

    const positionOf = (id: string) => useBoardStore.getState().agents.find(a => a.id === id)?.position
    const settled = () => vi.waitFor(() => expect(useBoardStore.getState()._movingSpaceId).toBeNull())

    it('carries the placed agents of the Box by the same step, and writes each of them', async () => {
        useBoardStore.getState().moveSpace('s1', MOVED)

        expect(useBoardStore.getState().spaces.find(s => s.id === 's1')).toMatchObject(MOVED)
        expect(positionOf('carried')).toEqual({ col: 1, row: 21 })
        expect(positionOf('unplaced')).toEqual({ col: UNPLACED_COL, row: 0 })
        expect(positionOf('neighbour')).toEqual({ col: 10, row: 1 })

        await settled()
        expect(db.fake.writes('spaces').map(w => w.payload)).toEqual([MOVED])
        expect(db.fake.writes('agents').map(w => w.payload)).toEqual([{ col: 1, row: 21 }])
        expect(toast.error).not.toHaveBeenCalled()
    })

    it('puts the Box and its agents back, on screen and in the database, when a write is refused', async () => {
        db.refusing.add('agents')
        useBoardStore.getState().moveSpace('s1', MOVED)
        await settled()

        expect(useBoardStore.getState().spaces.find(s => s.id === 's1')).toMatchObject({ col_start: 0, row_start: 0, col_end: 7, row_end: 9 })
        expect(positionOf('carried')).toEqual({ col: 1, row: 1 })
        expect(db.fake.writes('spaces').map(w => w.payload)).toEqual([MOVED, { col_start: 0, row_start: 0, col_end: 7, row_end: 9 }])
        expect(db.fake.writes('agents').map(w => w.payload)).toEqual([{ col: 1, row: 21 }, { col: 1, row: 1 }])
        expect(toast.error).toHaveBeenCalledWith('Could not move this Box', expect.anything())
    })

    it('keeps a carried agent where it was dropped when a realtime update still holds its old place', async () => {
        useBoardStore.getState().moveSpace('s1', MOVED)
        useBoardStore.getState()._onAgentUpdate(agent('carried', 's1', 1, 1))
        useBoardStore.getState()._realtimeUpdateSpace(space('s1', 0, 7))

        expect(positionOf('carried')).toEqual({ col: 1, row: 21 })
        expect(useBoardStore.getState().spaces.find(s => s.id === 's1')).toMatchObject(MOVED)
        await settled()
    })
})
