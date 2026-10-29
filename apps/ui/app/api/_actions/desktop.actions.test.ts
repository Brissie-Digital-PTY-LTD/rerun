import { assertAgentInWorkspace, requireWorkspaceContext } from '@/app/api/_auth/ownership'
import { desktopSocketUrl, resolveWorkspaceDesktop } from '@/app/api/_services/desktop.service'
import * as engine from '@/lib/engine/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openDesktopAction, startTakeoverAction } from './desktop.actions'

vi.mock('@/app/api/_auth/ownership', () => ({ assertAgentInWorkspace: vi.fn(), requireWorkspaceContext: vi.fn() }))
vi.mock('@/app/api/_services/desktop.service', () => ({
    DesktopUnavailableError: class extends Error {},
    desktopSocketUrl: vi.fn(),
    resolveWorkspaceDesktop: vi.fn(),
}))
vi.mock('@/app/api/_services/workspace-engine.service', () => ({ NoEngineError: class extends Error {} }))
vi.mock('@/lib/engine/client', () => ({ finishTakeover: vi.fn(), openDesktopApp: vi.fn(), startDesktop: vi.fn(), startTakeover: vi.fn() }))

const conn = { baseUrl: 'https://engine.test', apiKey: 'box-key' }

describe('openDesktopAction', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(requireWorkspaceContext).mockResolvedValue({ authUser: { is_anonymous: false }, workspace: { id: 7 } } as never)
        vi.mocked(assertAgentInWorkspace).mockResolvedValue({ workspace_id: 7, space_id: null, engine_agent_id: 'engine-agent' } as never)
        vi.mocked(resolveWorkspaceDesktop).mockResolvedValue({ conn, socketBase: 'wss://host.test/box/10/desktop/ws' })
        vi.mocked(desktopSocketUrl).mockReturnValue('wss://host.test/box/10/desktop/ws?ticket=t')
    })

    it('starts the screen on the viewer time zone and says whether it draws its own dock', async () => {
        vi.mocked(engine.startDesktop).mockResolvedValue({
            available: true,
            screens: [
                { agentId: 'other-agent', viewers: 0, takeover: false, dock: false, agentDriving: false },
                { agentId: 'engine-agent', viewers: 0, takeover: false, dock: true, agentDriving: false },
            ],
        })
        await expect(openDesktopAction('agent', 'watch', 'Europe/Paris')).resolves.toEqual({ ok: true, socketUrl: 'wss://host.test/box/10/desktop/ws?ticket=t', dock: true })
        expect(engine.startDesktop).toHaveBeenCalledWith(conn, 'engine-agent', 'Europe/Paris')
        expect(desktopSocketUrl).toHaveBeenCalledWith(expect.anything(), 'engine-agent', 'watch')
    })

    it('keeps the launchers of the app for a machine that reports no screen of its own', async () => {
        vi.mocked(engine.startDesktop).mockResolvedValue({ available: true, screens: [] })
        await expect(openDesktopAction('agent', 'drive')).resolves.toMatchObject({ ok: true, dock: false })
    })
})

describe('startTakeoverAction', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(requireWorkspaceContext).mockResolvedValue({ authUser: { is_anonymous: false }, workspace: { id: 7 } } as never)
        vi.mocked(assertAgentInWorkspace).mockResolvedValue({ workspace_id: 7, space_id: null, engine_agent_id: 'engine-agent' } as never)
        vi.mocked(resolveWorkspaceDesktop).mockResolvedValue({ conn, socketBase: 'wss://host.test/box/10/desktop/ws' })
        vi.mocked(engine.startTakeover).mockResolvedValue(undefined)
    })

    it('opens the agent browser on the page it was asked for', async () => {
        await expect(startTakeoverAction('agent', 'https://www.linkedin.com/login')).resolves.toEqual({ ok: true })
        expect(engine.startTakeover).toHaveBeenCalledWith(conn, 'engine-agent', 'https://www.linkedin.com/login')
    })

    it('opens the agent browser without a page when the one asked for is not a URL', async () => {
        await expect(startTakeoverAction('agent', 'not a url')).resolves.toEqual({ ok: true })
        expect(engine.startTakeover).toHaveBeenCalledWith(conn, 'engine-agent', undefined)
    })
})
