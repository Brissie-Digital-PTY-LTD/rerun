import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pauseAgentSchedules } from '@/app/api/_services/agent.service'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { fakeSupabase } from '@/test/supabase-fake'
import { runContext } from '@/test/trigger-sdk'
import { requestTemplateRevocation, revokeTemplateAccessTask } from './revoke-template-access'

vi.mock('@trigger.dev/sdk/v3', async () => (await import('@/test/trigger-sdk')).triggerSdkMock())
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/app/api/_services/agent.service', () => ({ pauseAgentSchedules: vi.fn(), resumeAgentSchedules: vi.fn() }))

type Run = (payload: unknown, params: unknown) => Promise<unknown>
const run = () => ((revokeTemplateAccessTask as unknown as { run: Run }).run)({ workspaceId: 1, templateId: 'tpl' }, runContext())

describe('revokeTemplateAccessTask', () => {
    let db: ReturnType<typeof fakeSupabase>

    beforeEach(() => {
        vi.clearAllMocks()
        db = fakeSupabase(() => ({ data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }))
        vi.mocked(createServiceRoleClient).mockReturnValue(db.client)
        vi.mocked(pauseAgentSchedules).mockResolvedValue(undefined as never)
    })

    it('pauses every agent the revocation disabled', async () => {
        await expect(run()).resolves.toEqual({ workspaceId: 1, templateId: 'tpl' })

        expect(vi.mocked(pauseAgentSchedules).mock.calls.map(([id]) => id)).toEqual(['a', 'b', 'c'])
        const [read] = db.chainsOn('agents')
        expect(read).toContainEqual({ table: 'agents', method: 'eq', args: ['disabled_reason', 'template_revoked:tpl'] })
    })

    it('throws on the first agent it cannot reach, so the retry pauses them all again', async () => {
        vi.mocked(pauseAgentSchedules).mockImplementation((async (id: string) => {
            if (id === 'b') throw new Error('box asleep')
        }) as never)

        await expect(run()).rejects.toThrow('box asleep')
        expect(vi.mocked(pauseAgentSchedules).mock.calls.map(([id]) => id)).toEqual(['a', 'b'])

        vi.mocked(pauseAgentSchedules).mockClear().mockResolvedValue(undefined as never)
        await run()
        expect(vi.mocked(pauseAgentSchedules).mock.calls.map(([id]) => id)).toEqual(['a', 'b', 'c'])
    })
})

describe('requestTemplateRevocation', () => {
    beforeEach(() => vi.clearAllMocks())

    it('hands the revocation to the task', async () => {
        await requestTemplateRevocation({ workspaceId: 1, templateId: 'tpl' })

        expect(revokeTemplateAccessTask.trigger).toHaveBeenCalledWith({ workspaceId: 1, templateId: 'tpl' })
    })

    it('swallows a Trigger outage', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(revokeTemplateAccessTask.trigger).mockRejectedValueOnce(new Error('trigger down'))

        await expect(requestTemplateRevocation({ workspaceId: 1, templateId: 'tpl' })).resolves.toBeUndefined()
    })
})
