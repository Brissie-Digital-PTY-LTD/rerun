import type { InboxItem, InboxStatus } from '@rerun/contracts'

import type { CoworkerStatus } from '@/mocks/data'

export type InboxSection = { title: string; items: InboxItem[] }

// The web's sections, in its order.
const SECTIONS: { title: string; statuses: InboxStatus[] }[] = [
    { title: 'Needs you', statuses: ['awaiting_question', 'awaiting_approval', 'awaiting_connector', 'waiting_human'] },
    { title: 'Heads-ups', statuses: ['awaiting_ack'] },
    { title: 'Errors', statuses: ['error'] },
    { title: 'Done', statuses: ['done'] },
]

export const STATUS_SENTENCE: Record<InboxStatus, string> = {
    awaiting_question: 'asked you a question',
    awaiting_approval: 'needs your approval',
    awaiting_connector: 'needs an app connected',
    waiting_human: 'is waiting on you',
    awaiting_ack: 'flagged something for you',
    error: 'hit an error',
    done: 'finished its run',
}

export function inboxSections(items: InboxItem[]): InboxSection[] {
    return SECTIONS.map(section => ({ title: section.title, items: items.filter(item => section.statuses.includes(item.status)) })).filter(section => section.items.length > 0)
}

// What the bell counts: every run a row stands for, as the web's tab title does.
export function inboxCount(items: InboxItem[]): number {
    return items.reduce((sum, item) => sum + item.count, 0)
}

export function badgeLabel(count: number): string {
    return count > 99 ? '99+' : String(count)
}

export function moodOfInbox(status: InboxStatus): CoworkerStatus {
    if (status === 'error') return 'error'
    if (status === 'done') return 'idle'
    return 'waiting_human'
}
