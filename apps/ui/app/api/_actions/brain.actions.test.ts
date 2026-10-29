import { requireWorkspaceConnection } from '@/app/api/_auth/workspace-target'
import { NoEngineError } from '@/app/api/_services/workspace-engine.service'
import * as engine from '@/lib/engine/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listBrainProposalsAction, loadBrainAction } from './brain.actions'
import { listWorkspaceTablesAction } from './workspace-db.actions'
import { listWorkspaceFilesAction } from './workspace-file.actions'

vi.mock('@/app/api/_auth/ownership', () => ({ requireWorkspaceContext: vi.fn() }))
vi.mock('@/app/api/_auth/workspace-target', () => ({ requireWorkspaceConnection: vi.fn() }))
vi.mock('@/app/api/_services/workspace-engine.service', () => ({ NoEngineError: class NoEngineError extends Error {}, getWorkspaceConnection: vi.fn() }))
vi.mock('@/app/api/_services/file.service', () => ({ saveTextFile: vi.fn() }))
vi.mock('@/lib/engine/client', () => ({
    EngineRequestError: class EngineRequestError extends Error {
        constructor(
            message: string,
            readonly status: number
        ) {
            super(message)
        }
    },
    SPACE_DATA_BASE: '/shared/db',
    countBrainProposals: vi.fn(),
    listBrainPages: vi.fn(),
    listBrainProposals: vi.fn(),
    listDbTables: vi.fn(),
    listFiles: vi.fn(),
}))

const conn = { baseUrl: 'https://engine.test', apiKey: 'box-key' }

describe('a workspace without a machine yet', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(requireWorkspaceConnection).mockRejectedValue(new NoEngineError())
    })

    it('reads the Brain as not set up rather than failing', async () => {
        await expect(loadBrainAction()).resolves.toEqual({ available: false, reason: 'no_machine' })
        await expect(listBrainProposalsAction()).resolves.toEqual([])
    })

    it('lists no shared table and no shared file', async () => {
        await expect(listWorkspaceTablesAction()).resolves.toEqual([])
        await expect(listWorkspaceFilesAction('docs')).resolves.toEqual({ entries: [], path: 'docs' })
    })
})

describe('a workspace with a machine', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(requireWorkspaceConnection).mockResolvedValue(conn)
    })

    it('reads a box that predates the Brain as outdated', async () => {
        vi.mocked(engine.listBrainPages).mockRejectedValue(new engine.EngineRequestError('failed: 404', 404))
        vi.mocked(engine.countBrainProposals).mockResolvedValue(0)
        await expect(loadBrainAction()).resolves.toEqual({ available: false, reason: 'outdated' })
    })

    it('still fails when the machine does not answer', async () => {
        vi.mocked(engine.listBrainPages).mockRejectedValue(new Error('fetch failed'))
        vi.mocked(engine.countBrainProposals).mockResolvedValue(0)
        vi.mocked(engine.listDbTables).mockRejectedValue(new Error('fetch failed'))
        vi.mocked(engine.listFiles).mockRejectedValue(new Error('fetch failed'))
        await expect(loadBrainAction()).rejects.toThrow('fetch failed')
        await expect(listWorkspaceTablesAction()).rejects.toThrow('fetch failed')
        await expect(listWorkspaceFilesAction()).rejects.toThrow('fetch failed')
    })
})
