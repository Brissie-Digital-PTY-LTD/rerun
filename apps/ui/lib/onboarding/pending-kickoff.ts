import { z } from 'zod'

// The first message of a freshly created agent, parked in localStorage until it is actually
// delivered by startKickoffAction. Cleared only after a successful send, so a reload during the
// finish-setup wizard cannot lose it: HomeContent replays any leftover entry at boot.
const pendingKickoffSchema = z.object({
    agentId: z.string().min(1),
    // Detailed onboarding brief, sent verbatim when present.
    kickoff: z.string().optional(),
    // Use-case description, reformulated server-side into a short first message.
    description: z.string().optional(),
})

export type PendingKickoff = z.infer<typeof pendingKickoffSchema>

const STORAGE_KEY = 'rerun:pending-kickoff'

export function savePendingKickoff(entry: PendingKickoff): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingKickoffSchema.parse(entry)))
    } catch {
        // SSR or quota exceeded: the kickoff simply won't survive a reload.
    }
}

// Returns the parked entry, or null if absent / corrupted. A corrupted entry is purged so we
// don't trip on it again.
export function readPendingKickoff(): PendingKickoff | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = pendingKickoffSchema.safeParse(JSON.parse(raw))
        if (parsed.success) return parsed.data
        localStorage.removeItem(STORAGE_KEY)
        return null
    } catch {
        return null
    }
}

export function clearPendingKickoff(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {
        // ignore
    }
}
