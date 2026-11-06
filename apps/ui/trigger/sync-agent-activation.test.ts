import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stopAgentsOnEngine } from '@/app/api/_services/agent-activation.service'
import { triggerTask } from '@rerun/cloud/tasks'
import { runContext } from '@/test/trigger-sdk'
import { requestAgentActivationSync, syncAgentActivationTask } from './sync-agent-activation'

vi.mock('@trigger.dev/sdk/v3', async () => (await import('@/test/trigger-sdk')).triggerSdkMock())
vi.mock('@/app/api/_services/agent-activation.service', () => ({ stopAgentsOnEngine: vi.fn() }))
vi.mock('@rerun/cloud/tasks', async importOriginal => ({ ...(await importOriginal<object>()), triggerTask: vi.fn() }))

type Run = (payload: unknown, params: unknown) => Promise<unknown>

describe('syncAgentActivationTask', () => {
    beforeEach(() => vi.clearAllMocks())

    it('stops the agents on their engine', async () => {
        await expect(((syncAgentActivationTask as unknown as { run: Run }).run)({ agentIds: ['a', 'b'] }, runContext())).resolves.toEqual({ agentIds: ['a', 'b'] })
        expect(stopAgentsOnEngine).toHaveBeenCalledWith(['a', 'b'])
    })

    it('throws when the engine cannot be reached, so Trigger retries', async () => {
        vi.mocked(stopAgentsOnEngine).mockRejectedValue(new Error('box asleep'))

        await expect(((syncAgentActivationTask as unknown as { run: Run }).run)({ agentIds: ['a'] }, runContext())).rejects.toThrow('box asleep')
    })
})

describe('requestAgentActivationSync', () => {
    beforeEach(() => vi.clearAllMocks())

    it('triggers nothing for an empty list', async () => {
        await requestAgentActivationSync([])

        expect(triggerTask).not.toHaveBeenCalled()
    })

    it('hands the agents to the task', async () => {
        await requestAgentActivationSync(['a'])

        expect(triggerTask).toHaveBeenCalledWith('sync-agent-activation', { agentIds: ['a'] })
    })

    it('swallows a Trigger outage', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(triggerTask).mockRejectedValueOnce(new Error('trigger down'))

        await expect(requestAgentActivationSync(['a'])).resolves.toBeUndefined()
    })
})
