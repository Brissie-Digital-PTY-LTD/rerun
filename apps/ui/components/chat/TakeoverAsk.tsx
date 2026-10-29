'use client'

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { MonitorIcon, XIcon } from '@/lib/icons'

export type TakeoverRequestState = {
    reason: string
    site: string | null
    opened: boolean
    // The browser is being handed back, or already was: nothing is left to press.
    locked: boolean
    finishing: boolean
    onOpen: () => void
    onSkip: () => void
    onDone: () => void
}

// What the run asks of the person while it waits on its screen, laid out like the thread's HITL cards.
export function TakeoverAsk({ takeover }: { takeover: TakeoverRequestState }) {
    const { locked } = takeover
    return (
        <div className="space-y-3 p-3">
            <div className="flex items-start gap-2.5">
                <Icon size="sm" icon={MonitorIcon} className="bg-background text-foreground" />
                <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm leading-snug font-medium">{takeover.reason}</p>
                    <p className="truncate text-xs leading-snug text-muted-foreground">
                        {takeover.opened ? 'The browser is open on your coworker’s desktop. Come back here once you are through.' : takeover.site ? `Opens ${takeover.site} in your coworker’s browser, for you to drive.` : 'Opens your coworker’s browser, for you to drive.'}
                    </p>
                </div>
                <Button size="icon-sm" variant="ghost" disabled={locked} onClick={takeover.onSkip} aria-label="Skip the browser takeover" data-hitl="dismiss" className="-my-1 shrink-0 text-muted-foreground">
                    <XIcon className="size-4" />
                </Button>
            </div>
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs leading-snug text-muted-foreground/70">What you sign in to stays in this coworker’s browser on your machine.</p>
                <div className="flex shrink-0 items-center gap-2">
                    {takeover.opened ? (
                        <>
                            <Button size="sm" variant="outline" disabled={locked} onClick={takeover.onOpen} data-hitl="reopen">
                                Open again
                            </Button>
                            <Button size="sm" disabled={locked} onClick={takeover.onDone} data-hitl="done">
                                {takeover.finishing ? 'Closing…' : 'Done'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size="sm" variant="outline" disabled={locked} onClick={takeover.onSkip} data-hitl="skip">
                                Skip
                            </Button>
                            <Button size="sm" disabled={locked} onClick={takeover.onOpen} data-hitl="open">
                                Open browser
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
