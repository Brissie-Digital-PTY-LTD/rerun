import { requireWorkspaceContext } from '@/app/api/_auth/ownership'
import { isPhoneStepPending } from '@/cloud/phone.server'
import { loadForemanConversation } from '@/lib/foreman/conversation'
import { loadForemanState } from '@/lib/foreman/state'
import { resolveForemanSurface } from '@/lib/foreman/surface.server'
import { PHONE_REQUIRED_MESSAGE } from '@/cloud/phone'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

vi.mock('@/app/api/_auth/ownership', () => ({ requireWorkspaceContext: vi.fn() }))
vi.mock('@/cloud/phone.server', () => ({ isPhoneStepPending: vi.fn() }))
vi.mock('@/app/api/_services/me.service', () => ({ messageAuthorOf: vi.fn() }))
vi.mock('@/app/api/_services/workspace-engine.service', () => ({ getWorkspaceConnection: vi.fn(), NoEngineError: class NoEngineError extends Error {} }))
vi.mock('@/lib/chat/start-chat', () => ({ QUEUED_RETRY_DELAYS_MS: [], startChat: vi.fn() }))
vi.mock('@/lib/engine/client', () => ({ cancelRun: vi.fn(), reconnectRun: vi.fn() }))
vi.mock('@/lib/foreman/conversation', () => ({
    cancelForemanSessionRuns: vi.fn(),
    engineSessionOf: vi.fn().mockResolvedValue(null),
    loadForemanConversation: vi.fn(),
    readForemanEngineMessages: vi.fn(),
    startEngineConversation: vi.fn(),
    touchForemanConversation: vi.fn(),
}))
vi.mock('@/lib/foreman/engine-brief', () => ({ foremanEngineBrief: vi.fn() }))
vi.mock('@/lib/foreman/state', () => ({ loadForemanState: vi.fn() }))
vi.mock('@/lib/foreman/surface.server', () => ({ resolveForemanSurface: vi.fn() }))

const URL = 'https://rerun.test/api/chat/foreman/engine'
const post = () => new Request(URL, { method: 'POST', body: JSON.stringify({ sessionId: 'session', text: 'ship it' }) })

describe('/api/chat/foreman/engine', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(requireWorkspaceContext).mockResolvedValue({ userId: 'user-1', authUser: { is_anonymous: false }, workspace: { id: 7 }, supabase: {} } as never)
        vi.mocked(loadForemanState).mockResolvedValue({ phase: 'onboarding' } as never)
        vi.mocked(resolveForemanSurface).mockResolvedValue('hub' as never)
    })

    it('turns away a message from an account that still owes its phone number', async () => {
        vi.mocked(isPhoneStepPending).mockResolvedValue(true)

        const response = await POST(post())

        expect(response.status).toBe(403)
        expect(await response.json()).toEqual({ error: PHONE_REQUIRED_MESSAGE })
        expect(loadForemanState).not.toHaveBeenCalled()
    })

    it('lets a message from an account that owes nothing through', async () => {
        vi.mocked(isPhoneStepPending).mockResolvedValue(false)

        const response = await POST(post())

        expect(response.status).toBe(409)
        expect(loadForemanState).toHaveBeenCalledOnce()
    })

    it('still reopens the conversation of an account that owes its phone number', async () => {
        vi.mocked(isPhoneStepPending).mockResolvedValue(true)
        vi.mocked(loadForemanConversation).mockResolvedValue(null)

        const response = await GET(new Request(URL))

        expect(response.status).toBe(200)
        expect(isPhoneStepPending).not.toHaveBeenCalled()
    })
})
