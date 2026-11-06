import type { AgentConversationsOverview, AgentStatus, BoardAgent, Box } from '@rerun/contracts'

import type { StatusLine } from '@/components/ui/status'

export type HomeCoworker = {
    id: string
    name: string
    handle: string | null
    description: string | null
    status: AgentStatus
    // Switched off, by hand or because the plan has no room left for it.
    paused: boolean
    spaceId: string
    latest: AgentConversationsOverview[number]['latest']
    pending: number
}

export type SectionKey = 'needs' | 'working' | 'coworkers'

// Same label as the web for a Box nobody named.
export const UNNAMED_BOX_LABEL = 'Untitled Box'

export type HomeSection = { key: string; label: string; members: HomeCoworker[] }

export function toHomeCoworkers(agents: BoardAgent[], overview: AgentConversationsOverview): HomeCoworker[] {
    const byAgent = new Map(overview.map(entry => [entry.agentId, entry]))
    return agents.map(agent => {
        const entry = byAgent.get(agent.id)
        return { id: agent.id, name: agent.name, handle: agent.handle, description: agent.description, status: agent.status, paused: Boolean(agent.disabledAt), spaceId: agent.spaceId, latest: entry?.latest ?? null, pending: entry?.pending ?? 0 }
    })
}

export function sectionOf(coworker: HomeCoworker): SectionKey {
    if (coworker.paused) return 'coworkers'
    if (coworker.status === 'waiting_human' || coworker.status === 'error') return 'needs'
    if (coworker.status === 'working') return 'working'
    return 'coworkers'
}

// The avatar's mood: a paused coworker sleeps like one whose machine is off.
export const moodStatus = (coworker: HomeCoworker): AgentStatus => (coworker.paused ? 'offline' : coworker.status)

// The one line under a coworker's name: what it needs from you, what it is doing, or where it left off.
export function lineOf(coworker: HomeCoworker): StatusLine {
    const title = coworker.latest?.title?.trim()
    const about = coworker.description?.trim() ?? ''
    if (coworker.paused) return { text: 'Paused', tone: 'muted' }
    if (coworker.status === 'waiting_human') return { text: title || 'Waiting for you', tone: 'waiting' }
    if (coworker.status === 'error') return { text: 'Something went wrong', tone: 'destructive' }
    if (coworker.status === 'working') return { text: ['Working', title || about].filter(Boolean).join(' · '), tone: 'muted' }
    if (coworker.status === 'offline') return { text: ['Asleep', about].filter(Boolean).join(' · '), tone: 'muted' }
    return { text: title || about, tone: 'muted' }
}

// The most recently active first.
export function byRecency(a: HomeCoworker, b: HomeCoworker): number {
    return (b.latest?.updatedAt ?? '').localeCompare(a.latest?.updatedAt ?? '')
}

export function minutesSince(iso: string | null | undefined, now = Date.now()): number | null {
    if (!iso) return null
    return Math.max(0, Math.floor((now - Date.parse(iso)) / 60000))
}

// Every coworker in one list, the most recently active first.
export function recentCoworkers(coworkers: HomeCoworker[]): HomeCoworker[] {
    return [...coworkers].sort(byRecency)
}

// The coworkers by Box, in the order the Boxes were made, as on the web board. A Box without a
// coworker left is left out.
export function sectionsByBox(coworkers: HomeCoworker[], boxes: Box[]): HomeSection[] {
    const ordered = [...coworkers].sort(byRecency)
    return boxes.map(box => ({ key: box.id, label: box.name?.trim() || UNNAMED_BOX_LABEL, members: ordered.filter(coworker => coworker.spaceId === box.id) })).filter(section => section.members.length > 0)
}

// The coworkers pinned on this phone, in the order they were arranged, and everyone else. A pin of a
// coworker deleted since is simply skipped.
export function withPinned(coworkers: HomeCoworker[], pinnedIds: readonly string[]): { pinned: HomeCoworker[]; others: HomeCoworker[] } {
    const byId = new Map(coworkers.map(coworker => [coworker.id, coworker]))
    const pinned = pinnedIds.flatMap(id => byId.get(id) ?? [])
    const kept = new Set(pinned.map(coworker => coworker.id))
    return { pinned, others: coworkers.filter(coworker => !kept.has(coworker.id)) }
}

// The order after a pinned row was dragged from one place to another.
export function moveIn<T>(items: readonly T[], from: number, to: number): T[] {
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(Math.max(0, Math.min(to, next.length)), 0, moved)
    return next
}
