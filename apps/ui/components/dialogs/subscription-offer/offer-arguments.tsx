'use client'

import { RERUN_CLOUD } from '@/cloud/edition'
import { Icon } from '@/components/ui/icon'
import { ProviderIcon } from '@/lib/engine/provider-icons'
import { PlugIcon, ShieldCheckIcon, UsersIcon, type LucideIcon } from '@/lib/icons'

type OfferArgument = { label: string; description: string; icon: LucideIcon; pile?: boolean }

const ARGUMENTS: OfferArgument[] = [
    {
        label: 'Everyone brings their own',
        description: 'Each teammate connects the plan they pay for. No account passed around.',
        icon: UsersIcon,
        pile: true,
    },
    {
        label: 'Rerun never sees your password',
        description: "You approve it on Claude's or OpenAI's own page, and nowhere else.",
        icon: ShieldCheckIcon,
    },
    {
        label: 'Unplug it whenever',
        description: `Disconnect in one click and your coworkers fall back on ${RERUN_CLOUD ? 'Rerun credits' : 'your OpenRouter key'}.`,
        icon: PlugIcon,
    },
]

// The connections a team holds, stacked like a facepile: three teammates, three accounts of their
// own, the same three the board shows. Says "one each" faster than the sentence under it.
const TEAM_CONNECTIONS = ['claude', 'codex', 'openrouter'] as const

export function OfferArguments() {
    return (
        <ul className="flex flex-col gap-4">
            {ARGUMENTS.map(point => (
                <li key={point.label} className="flex items-start gap-3">
                    <Icon size="sm" icon={point.icon} />
                    <div className="min-w-0">
                        <p className="flex items-center text-sm font-medium">
                            {point.label}
                            {point.pile && <ConnectionPile />}
                        </p>
                        <p className="text-xs text-muted-foreground">{point.description}</p>
                    </div>
                </li>
            ))}
        </ul>
    )
}

function ConnectionPile() {
    return (
        <span className="ml-2 inline-flex translate-y-0.5 items-center">
            {TEAM_CONNECTIONS.map(provider => (
                <span key={provider} className="flex size-5 items-center justify-center rounded-full bg-muted ring-2 ring-popover not-first:-ml-1.5">
                    <ProviderIcon provider={provider} className="size-3" />
                </span>
            ))}
        </span>
    )
}
