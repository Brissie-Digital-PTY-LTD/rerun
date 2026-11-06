// The cancellation reason left on the Stripe subscription whose trial was refused because its card
// had already spent one. It lives there rather than in a column: it survives webhook replays, costs
// nothing to store, and support reads it straight from the dashboard. The value is unchanged from
// when this used to bill the card instead of cancelling, so older subscriptions stay searchable.
export const TRIAL_BLOCKED_CARD_REUSE = 'card_fingerprint_reuse'

// Off unless TRIAL_CARD_REUSE_BLOCK is 'true'. The block was armed against one abuser and kept
// refusing honest second workspaces, our own test accounts included. Fingerprints are recorded
// either way, so arming it again finds a complete history. Read on every call, not at module load,
// so flipping the variable needs no rebuild.
export function isTrialCardReuseBlocked(): boolean {
    return process.env.TRIAL_CARD_REUSE_BLOCK === 'true'
}

export type TrialCardClaim = { id: string; workspace_id: number | null; created_at: string }

// The first row ever written for a fingerprint owns that card's one free trial.
//
// Asking "is the first claim mine" rather than "does a claim exist elsewhere" is what makes the
// comped workspace re-entering a trial pass with no special case: its own row is already the first
// one. It also settles the race, since two checkouts on one card both read the table after writing
// and reach the same verdict, and it survives the deletion of the workspace that spent the trial,
// whose row stays behind with a null workspace_id and keeps winning.
export function ownsTrialClaim(claims: TrialCardClaim[], workspaceId: number): boolean {
    const first = [...claims].sort(compareClaims)[0]
    if (!first) return true
    return first.workspace_id === workspaceId
}

// Two rows written in the same millisecond still have to be ordered the same way by every caller,
// hence the id as a tie-break.
function compareClaims(a: TrialCardClaim, b: TrialCardClaim): number {
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1
    return a.id < b.id ? -1 : 1
}
