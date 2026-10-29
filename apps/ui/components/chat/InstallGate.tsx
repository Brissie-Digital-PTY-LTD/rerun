'use client'

import { Button } from '@/components/ui/button'
import { ArrowRightIcon } from '@/lib/icons'
import { AgentBuddy } from '@rerun/ui/iso-grid'
import { CoinStack, type CatalogEntry } from '@rerun/ui/new-agent'
import { Spinner } from '@rerun/ui/primitives'
import { type ReactNode, useState } from 'react'

function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`
}

// A rough guess, the install guide carries no duration: a minute or so per app to connect, on top of
// the questions and the test run.
function setupFacts(apps: CatalogEntry[]): string {
    const minutes = `~${Math.max(2, 1 + apps.length)} min`
    return apps.length > 0 ? `${plural(apps.length, 'app')} · ${minutes}` : minutes
}

// Stands where the composer stands, because a message typed before the setup runs lands on an
// agent with no credentials and nothing connected. The escape hatch is deliberate: skipping is
// the user's call, and it never tells the agent its install is done.
// `modelSlot` carries the composer's model picker: the install is a normal run, so it has to be
// switchable before it starts, or a workspace out of Rerun credit has no way through.
// `inProgress`: the install already runs in another conversation, and starting it here would ask the
// user everything a second time. The gate leads there instead.
// `onStart` answers whether the install went out: false (no model ready) leaves the button ready.
export function InstallGate({
    agentId,
    agentName,
    apps,
    onStart,
    onSkip,
    onContinue,
    inProgress = false,
    disabled = false,
    modelSlot,
    hint,
}: {
    agentId: string
    agentName: string
    apps: CatalogEntry[]
    onStart: () => boolean
    onSkip: () => void
    onContinue?: () => void
    inProgress?: boolean
    disabled?: boolean
    modelSlot?: ReactNode
    hint?: ReactNode
}) {
    const [launched, setLaunched] = useState(false)
    const starting = launched || disabled

    const start = () => {
        if (onStart()) setLaunched(true)
    }

    return (
        <div className="space-y-3 [--cut:var(--color-background)]">
            <div className="flex items-center gap-3">
                <AgentBuddy agentId={agentId} mood={inProgress ? 'idle' : starting ? 'working' : 'waiting'} size={40} facing="right" alive />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inProgress ? `${agentName} is being set up` : `Set up ${agentName}`}</p>
                    <p className="text-xs text-pretty text-muted-foreground">{inProgress ? 'In another conversation' : setupFacts(apps)}</p>
                </div>
                {apps.length > 0 && <CoinStack apps={apps} size={24} overlap={7} className="shrink-0" />}
            </div>
            {hint}
            {inProgress ? (
                <Button size="lg" disabled={disabled} onClick={onContinue} className="w-full">
                    Continue setup
                    <ArrowRightIcon data-icon="inline-end" />
                </Button>
            ) : (
                <Button size="lg" disabled={starting} onClick={start} className="w-full">
                    {starting && <Spinner data-icon="inline-start" />}
                    <span className="truncate">{starting ? 'Installing' : `Install ${agentName}`}</span>
                    {!starting && <ArrowRightIcon data-icon="inline-end" />}
                </Button>
            )}
            <div className="flex flex-wrap items-center justify-between gap-1">
                {modelSlot}
                <Button size="sm" variant="ghost" disabled={starting} onClick={onSkip} className="ml-auto text-muted-foreground">
                    Skip for now
                </Button>
            </div>
        </div>
    )
}
