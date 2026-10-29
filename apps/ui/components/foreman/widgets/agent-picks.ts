import { AGENT_TAB_LABELS, resolveTab, type AgentFocusTab } from '@/lib/board/types'

export type AgentPick = { agentId: string; tab: AgentFocusTab | null; conversationId: string | null; runId: string | null }

function text(entry: object, key: string): string | null {
    const value = (entry as Record<string, unknown>)[key]
    return typeof value === 'string' && value ? value : null
}

// Tolerant on purpose: the call is rendered while it streams, so the array and its last entry can
// be half written. A tab the panel does not have leaves a row that still selects the coworker.
export function readAgentPicks(input: unknown): AgentPick[] {
    const agents = input && typeof input === 'object' ? (input as { agents?: unknown }).agents : undefined
    if (!Array.isArray(agents)) return []
    return agents.flatMap(entry => {
        if (!entry || typeof entry !== 'object') return []
        const agentId = text(entry, 'agentId')
        if (!agentId) return []
        const requested = text(entry, 'tab')
        return [{ agentId, tab: requested ? resolveTab(requested, AGENT_TAB_LABELS) : null, conversationId: text(entry, 'conversationId'), runId: text(entry, 'runId') }]
    })
}
