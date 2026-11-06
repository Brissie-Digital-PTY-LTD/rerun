import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pickLifecycleEmail, type LifecycleCandidate, type LifecycleSnapshot } from '@/ee/lib/lifecycle/decide'
import { loadLifecycleContext, type LifecycleContext, type UserRow } from '@/ee/lib/lifecycle/discovery'
import { deliverLifecycleEmail } from '@/ee/lib/lifecycle/send'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { fakeSupabase } from '@/test/supabase-fake'
import { runContext } from '@/test/trigger-sdk'
import { lifecycleSweep, lifecycleSweepSchedule } from './lifecycle-emails'

vi.mock('@trigger.dev/sdk/v3', async () => (await import('@/test/trigger-sdk')).triggerSdkMock())
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/ee/lib/lifecycle/decide', () => ({ pickLifecycleEmail: vi.fn() }))
vi.mock('@/ee/lib/lifecycle/discovery', () => ({ loadLifecycleContext: vi.fn() }))
vi.mock('@/ee/lib/lifecycle/send', () => ({ deliverLifecycleEmail: vi.fn() }))

function contextFor(userIds: string[]): LifecycleContext {
    const snapshots = userIds.map(userId => ({ userId, workspaceId: 1 }) as LifecycleSnapshot)
    const users = new Map(userIds.map(id => [id, { id, workspace_id: 1 } as UserRow]))
    return { snapshots, users, workspaces: new Map(), agentNames: new Map([['agent-1', 'Scout']]) }
}

function candidate(userId: string, overrides: Partial<LifecycleCandidate> = {}): LifecycleCandidate {
    return { sequenceKey: 'onboarding_resume', userId, workspaceId: 1, agentId: null, agentName: null, category: 'product', urgent: false, ...overrides }
}

type Run = (payload: unknown, params: unknown) => Promise<unknown>
const runTask = (payload: unknown) => ((lifecycleSweep as unknown as { run: Run }).run)(payload, runContext('PRODUCTION'))
const runSchedule = (env: Parameters<typeof runContext>[0] = 'PRODUCTION') => ((lifecycleSweepSchedule as unknown as { run: Run }).run)({}, runContext(env))

describe('lifecycleSweep', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(createServiceRoleClient).mockReturnValue(fakeSupabase().client)
        vi.mocked(pickLifecycleEmail).mockImplementation(snapshot => candidate(snapshot.userId))
        vi.mocked(deliverLifecycleEmail).mockResolvedValue({ sent: true })
    })

    it('delivers one email per picked candidate and tallies them', async () => {
        vi.mocked(loadLifecycleContext).mockResolvedValue(contextFor(['a', 'b']))
        vi.mocked(deliverLifecycleEmail).mockResolvedValueOnce({ sent: false, reason: 'no address' })

        const report = await runTask({})

        expect(report).toEqual({ considered: 2, picked: { onboarding_resume: 2 }, sent: 1, skipped: ['onboarding_resume: no address'] })
    })

    it('sends nothing on a dry run', async () => {
        vi.mocked(loadLifecycleContext).mockResolvedValue(contextFor(['a']))

        const report = await runTask({ dryRun: true })

        expect(deliverLifecycleEmail).not.toHaveBeenCalled()
        expect(report).toMatchObject({ picked: { onboarding_resume: 1 }, sent: 0 })
    })

    it('narrows the sweep to the users passed', async () => {
        vi.mocked(loadLifecycleContext).mockResolvedValue(contextFor([]))

        await runTask({ userIds: ['a'] })

        expect(loadLifecycleContext).toHaveBeenCalledWith(expect.anything(), expect.any(Date), ['a'])
    })

    it('resolves the agent name from the context when the candidate carries none', async () => {
        vi.mocked(loadLifecycleContext).mockResolvedValue(contextFor(['a']))
        vi.mocked(pickLifecycleEmail).mockReturnValue(candidate('a', { sequenceKey: 'agent_idle', agentId: 'agent-1' }))

        await runTask({})

        expect(deliverLifecycleEmail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ agentName: 'Scout' }))
    })

    it('keeps delivering to the others when one delivery throws', async () => {
        vi.mocked(loadLifecycleContext).mockResolvedValue(contextFor(['a', 'b']))
        vi.mocked(deliverLifecycleEmail).mockRejectedValueOnce(new Error('auth admin down'))

        const report = await runTask({})

        expect(deliverLifecycleEmail).toHaveBeenCalledTimes(2)
        expect(report).toMatchObject({ sent: 1, skipped: ['onboarding_resume: auth admin down'] })
    })
})

describe('lifecycleSweepSchedule', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubEnv('LIFECYCLE_EMAILS_START_AT', '2026-01-01T00:00:00.000Z')
        vi.stubEnv('EMAIL_REDIRECT_TO', '')
        vi.mocked(createServiceRoleClient).mockReturnValue(fakeSupabase().client)
        vi.mocked(loadLifecycleContext).mockResolvedValue(contextFor([]))
    })
    afterEach(() => vi.unstubAllEnvs())

    it('skips the dev environment', async () => {
        await expect(runSchedule('DEVELOPMENT')).resolves.toBeNull()
        expect(loadLifecycleContext).not.toHaveBeenCalled()
    })

    it('skips when LIFECYCLE_EMAILS_START_AT is not set', async () => {
        vi.stubEnv('LIFECYCLE_EMAILS_START_AT', '')

        await expect(runSchedule()).resolves.toBeNull()
        expect(loadLifecycleContext).not.toHaveBeenCalled()
    })

    it('skips staging unless its emails are redirected', async () => {
        await expect(runSchedule('STAGING')).resolves.toBeNull()
        expect(loadLifecycleContext).not.toHaveBeenCalled()

        vi.stubEnv('EMAIL_REDIRECT_TO', 'qa@rerun.build')
        await expect(runSchedule('STAGING')).resolves.toMatchObject({ considered: 0 })
    })

    it('sweeps in production', async () => {
        await expect(runSchedule()).resolves.toMatchObject({ considered: 0, sent: 0 })
    })
})
