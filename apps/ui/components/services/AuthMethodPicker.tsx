'use client'

import { Icon } from '@/components/ui/icon'
import type { AuthMethodSummary } from '@/lib/services/types'
import { ArrowRight, KeyIcon, LinkIcon, LogIn, TerminalSquare, type LucideIcon } from '@/lib/icons'

// Fallback label when a method has no author-provided label, derived from its kind.
export function methodKindLabel(kind: AuthMethodSummary['kind']): string {
    switch (kind) {
        case 'oauth':
            return 'Sign in'
        case 'key':
            return 'API key'
        case 'stdio':
            return 'Local'
        case 'app':
            return 'Workspace account'
        default:
            return 'Connect'
    }
}

// Short explainer per method so users understand the difference between the choices.
function methodKindDescription(kind: AuthMethodSummary['kind']): string {
    switch (kind) {
        case 'oauth':
            return 'Sign in through a secure popup.'
        case 'key':
            return 'Paste an API key from the service.'
        case 'stdio':
            return 'Runs locally on your engine.'
        case 'app':
            return 'Pick an account connected to the workspace.'
        default:
            return 'No credentials required.'
    }
}

function methodKindIcon(kind: AuthMethodSummary['kind']): LucideIcon {
    switch (kind) {
        case 'oauth':
            return LogIn
        case 'key':
            return KeyIcon
        case 'stdio':
            return TerminalSquare
        default:
            return LinkIcon
    }
}

// Auth methods as a list to drill into: picking one opens its own configuration view.
// Renders nothing when a service exposes a single method.
export function AuthMethodPicker({ methods, onSelect }: { methods: AuthMethodSummary[]; onSelect: (id: string) => void }) {
    if (methods.length <= 1) return null
    return (
        <div className="flex flex-col gap-1.5">
            {methods.map(m => (
                <button key={m.id} type="button" onClick={() => onSelect(m.id)} className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted">
                    <Icon icon={methodKindIcon(m.kind)} size="sm" />
                    <span className="min-w-0 flex-1">
                        <span className="block font-medium">{m.label || methodKindLabel(m.kind)}</span>
                        <span className="block text-xs text-muted-foreground">{methodKindDescription(m.kind)}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </button>
            ))}
        </div>
    )
}
