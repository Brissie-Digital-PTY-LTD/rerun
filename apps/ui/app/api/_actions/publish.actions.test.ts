import { assertAgentInWorkspace } from '@/app/api/_auth/ownership'
import { publishFile } from '@/lib/services/publish'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { publishFileAction } from './publish.actions'

vi.mock('@/app/api/_auth/ownership', () => ({ assertAgentInWorkspace: vi.fn() }))
vi.mock('@/lib/services/publish', () => ({
    listPublished: vi.fn(),
    publishFile: vi.fn(),
    unpublishFile: vi.fn(),
}))

describe('publishFileAction', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(assertAgentInWorkspace).mockResolvedValue({ workspace_id: 1, space_id: 'space', engine_agent_id: 'engine-agent' })
    })

    it('publishes an owned agent file without a billing entitlement check', async () => {
        vi.mocked(publishFile).mockResolvedValue({
            status: 'published',
            url: 'https://rerun.test/p/file',
            publicUrl: 'https://storage.test/file',
            slug: 'file',
            path: 'report.pdf',
            kind: 'file',
            contentType: 'application/pdf',
            size: 42,
        })

        await expect(publishFileAction('agent', 'report.pdf')).resolves.toEqual({
            success: true,
            url: 'https://rerun.test/p/file',
        })
        expect(assertAgentInWorkspace).toHaveBeenCalledWith('agent')
        expect(publishFile).toHaveBeenCalledWith('agent', 'report.pdf')
    })

    it('still refuses publishing when ownership verification fails', async () => {
        vi.mocked(assertAgentInWorkspace).mockRejectedValue(new Error('Agent not found'))

        await expect(publishFileAction('other-agent', 'report.pdf')).resolves.toEqual({
            success: false,
            error: 'Agent not found',
        })
        expect(publishFile).not.toHaveBeenCalled()
    })
})
