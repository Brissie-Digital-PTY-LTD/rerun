'use client'

import type { DesktopApp, DesktopViewMode } from '@rerun/contracts'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { finishTakeoverAction, launchDesktopAppAction, openDesktopAction, startTakeoverAction } from '@/app/api/_actions/desktop.actions'
import { DesktopNotch } from '@/components/desktop/DesktopNotch'
import { DESKTOP_CONNECTING_LABEL, DesktopScreenLoader } from '@/components/desktop/DesktopScreenLoader'
import { DesktopViewer, type DesktopViewerHandle } from '@/components/desktop/DesktopViewer'
import { DesktopDialog } from '@/components/dialogs/DesktopDialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { MonitorIcon } from '@/lib/icons'
import { useBoardStore } from '@/stores/board.store'
import { useDesktopStore, type TakeoverTarget } from '@/stores/desktop.store'

type Screen = { status: 'loading' } | { status: 'live'; socketUrl: string; dock: boolean } | { status: 'error'; error: string } | { status: 'disconnected' }

const DESKTOP_DESCRIPTION = 'The screen this coworker works on. What you do here, it finds afterwards.'
const TAKEOVER_DESCRIPTION = 'You are in your coworker’s browser. Press Done when it can carry on.'
const TAKEOVER_HOLDS_BROWSER = 'Your coworker’s browser is already open for this request.'

const openScreen = (agentId: string, mode: DesktopViewMode) => openDesktopAction(agentId, mode, Intl.DateTimeFormat().resolvedOptions().timeZone)

async function connect(agentId: string, takeover: TakeoverTarget | null): Promise<Screen> {
    if (takeover) {
        const started = await startTakeoverAction(agentId, takeover.url)
        if (!started.ok) return { status: 'error', error: started.error }
    }
    const opened = await openScreen(agentId, 'drive')
    return opened.ok ? { status: 'live', socketUrl: opened.socketUrl, dock: opened.dock } : { status: 'error', error: opened.error }
}

// The screen of the agent whose sheet is open, in a dialog to drive it. Watching it happens in that
// agent's chat. It follows the sheet: another agent, or no sheet at all, closes it.
export function AgentDesktopView() {
    const agentId = useDesktopStore(s => s.agentId)
    const takeover = useDesktopStore(s => s.takeover)
    const close = useDesktopStore(s => s.close)
    const selectedAgentId = useBoardStore(s => s.selectedAgentId)
    const agentName = useBoardStore(s => s.agents.find(agent => agent.id === agentId)?.name)

    useEffect(() => {
        if (agentId && selectedAgentId !== agentId) close()
    }, [agentId, selectedAgentId, close])

    return (
        <DesktopDialog
            open={!!agentId}
            onOpenChange={open => {
                if (!open) close()
            }}
            title={takeover ? takeover.reason : agentName ? `${agentName}’s desktop` : 'Desktop'}
            description={takeover ? TAKEOVER_DESCRIPTION : DESKTOP_DESCRIPTION}
        >
            {agentId && <DesktopSession key={`${agentId}:${takeover?.callId ?? 'desktop'}`} agentId={agentId} takeover={takeover} />}
        </DesktopDialog>
    )
}

function DesktopSession({ agentId, takeover }: { agentId: string; takeover: TakeoverTarget | null }) {
    const handBack = useDesktopStore(s => s.handBack)
    const [screen, setScreen] = useState<Screen>({ status: 'loading' })
    const [busy, setBusy] = useState(false)
    const [browsing, setBrowsing] = useState(false)
    const viewerRef = useRef<DesktopViewerHandle>(null)
    // Two clicks on Done would hand the browser back twice, and resume the run twice.
    const finishingRef = useRef(false)
    const browsingRef = useRef(false)

    useEffect(() => {
        let alive = true
        void connect(agentId, takeover).then(result => {
            if (alive) setScreen(result)
        })
        return () => {
            alive = false
            // A browser opened from the notch holds the agent's profile for as long as it is open, so
            // it closes with the view instead of being left to its fifteen-minute limit.
            if (browsingRef.current) void finishTakeoverAction(agentId)
        }
        // Mounted once per session: the parent remounts this component for another agent or takeover.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const reconnect = async () => {
        setScreen({ status: 'loading' })
        setScreen(await connect(agentId, takeover))
    }

    const run = async (action: () => Promise<{ ok: true } | { ok: false; error: string }>): Promise<boolean> => {
        setBusy(true)
        const result = await action()
        setBusy(false)
        if (!result.ok) toast.error(result.error)
        return result.ok
    }

    const openApp = (app: DesktopApp) => void run(() => launchDesktopAppAction(agentId, app))

    const toggleBrowser = async () => {
        const next = !browsing
        if (!(await run(() => (next ? startTakeoverAction(agentId) : finishTakeoverAction(agentId)))) && next) return
        browsingRef.current = next
        setBrowsing(next)
    }

    const paste = async () => {
        try {
            viewerRef.current?.paste(await navigator.clipboard.readText())
        } catch {
            toast.error('Your browser did not let Rerun read the clipboard.')
        }
    }

    const done = async () => {
        if (!takeover || finishingRef.current) return
        finishingRef.current = true
        setBusy(true)
        const result = await finishTakeoverAction(agentId)
        setBusy(false)
        if (!result.ok) {
            finishingRef.current = false
            toast.error(result.error)
            return
        }
        handBack(takeover.callId, result.url)
    }

    const onDisconnect = useCallback(() => setScreen({ status: 'disconnected' }), [])
    const live = screen.status === 'live'

    return (
        <div className="relative flex min-h-0 flex-1 flex-col bg-muted/40">
            {screen.status === 'loading' && <DesktopScreenLoader label={DESKTOP_CONNECTING_LABEL} />}
            {screen.status === 'live' && <DesktopViewer ref={viewerRef} socketUrl={screen.socketUrl} onDisconnect={onDisconnect} />}
            {screen.status === 'error' && <EmptyState icon={MonitorIcon} title="The screen is not available" description={screen.error} action={<RetryButton onClick={() => void reconnect()} />} />}
            {screen.status === 'disconnected' && <EmptyState icon={MonitorIcon} title="The screen went away" description="The connection to the machine closed. Nothing on it was lost." action={<RetryButton onClick={() => void reconnect()} label="Reconnect" />} />}
            <DesktopNotch
                launchers={screen.status === 'live' && !screen.dock}
                browsing={browsing}
                browserLockedReason={takeover ? TAKEOVER_HOLDS_BROWSER : undefined}
                disabled={!live || busy}
                takeoverReason={takeover?.reason}
                onOpenApp={openApp}
                onToggleBrowser={() => void toggleBrowser()}
                onPaste={() => void paste()}
                onDone={takeover ? () => void done() : undefined}
            />
        </div>
    )
}

function RetryButton({ onClick, label = 'Try again' }: { onClick: () => void; label?: string }) {
    return (
        <Button size="sm" variant="outline" onClick={onClick}>
            {label}
        </Button>
    )
}
