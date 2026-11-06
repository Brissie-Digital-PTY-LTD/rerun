// Two questions that used to be welded into one boolean in applySubscriptionToWorkspace: has the
// Stripe billing period really moved, and does that buy a new Rerun credit window. Kept pure and
// dependency-free, unlike marketplace.ts which imports the Stripe client built at module load.

// The stored and the incoming period end describe the same instant in two renderings: PostgREST
// returns `2026-09-19T02:29:39+00:00`, `subscriptionPeriodEndIso` produces `2026-09-19T02:29:39.000Z`.
// A lexicographic `>` reads the second as the greater one, because '.' sorts after '+', so every
// subscription webhook looked like a renewal. Compare instants, never the strings.
export function hasPeriodAdvanced(stored: string | null | undefined, incoming: string | null | undefined): boolean {
    if (!incoming) return false
    const next = Date.parse(incoming)
    if (Number.isNaN(next)) return false
    if (!stored) return true

    const current = Date.parse(stored)
    // Fail closed on an unreadable stored value: this gates both the credit and a held downgrade,
    // and the rolling anchor in rerunBudget.service refills the workspace on its own anyway.
    if (Number.isNaN(current)) return false

    return next > current
}

type RerunPeriodUpdate = { rerun_used_micros?: number; rerun_period_anchor?: string }

// The anchor follows the billing period whenever it moves, so the lazy monthly reset stays aligned
// with Stripe. Zeroing the counter is money, and only a subscription that really renewed has bought
// a new window: a trial never renews, so it can never refill, whatever the dates say. That second
// rule is what keeps the cancel-and-reactivate refill dead even if a date bug ever comes back.
export function rerunPeriodUpdate(advanced: boolean, status: string, now: string): RerunPeriodUpdate {
    if (!advanced) return {}
    if (status === 'trialing') return { rerun_period_anchor: now }
    return { rerun_used_micros: 0, rerun_period_anchor: now }
}
