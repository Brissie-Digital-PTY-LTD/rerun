import { pendingApprovals, pendingHitlLabel, pendingMcpSignIn, pendingQuestions, pendingSecrets, pendingServices, pendingTakeover, type HitlKind } from '@rerun/contracts'
import type { SFSymbol } from 'expo-symbols'

const SYMBOLS: Record<HitlKind, SFSymbol> = { question: 'questionmark.bubble', approval: 'checkmark.shield', secret: 'lock', mcp: 'link', service: 'link', takeover: 'display' }

// The web's cue for a pending block, with the system's symbols.
export function summarizePendingHitl(kind: HitlKind, input: Record<string, unknown>): { symbol: SFSymbol; label: string } {
    return { symbol: SYMBOLS[kind], label: pendingHitlLabel(kind, input) }
}

const textOf = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

// The first thing the block asks, to read in the chat when the app cannot draw the block itself.
export function firstAsk(kind: HitlKind, input: Record<string, unknown>): string | null {
    switch (kind) {
        case 'question':
            return pendingQuestions(input)[0]?.question ?? null
        case 'approval':
            return pendingApprovals(input)[0]?.action ?? null
        case 'secret':
            return pendingSecrets(input)[0]?.label ?? null
        case 'service':
            return textOf(pendingServices(input)[0]?.reason)
        case 'mcp':
            return textOf(pendingMcpSignIn(input).reason)
        case 'takeover':
            return textOf(pendingTakeover(input).reason)
    }
}

const ASK_KEYS = ['question', 'message', 'reason', 'purpose', 'action', 'prompt', 'title', 'description']

// What a call the app has no name for asks, from the keys a HITL input usually says it with.
export function askOf(input: Record<string, unknown>): string | null {
    for (const key of ASK_KEYS) {
        const text = textOf(input[key])
        if (text) return text
    }
    return null
}
