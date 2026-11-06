import { TRIAL_ACTIVE_AGENTS } from '@rerun/contracts'

import { isSubscriptionEntitled } from '@/ee/lib/billing/entitlement'

export { TRIAL_ACTIVE_AGENTS }

// null = unlimited (sandbox workspaces). 0 = no plan, nothing may run.
//
// The entitlement is read first so that a workspace without a subscription keeps collapsing to
// zero whatever its snapshotted columns say. A trial reads the column like any plan: the webhook
// writes TRIAL_ACTIVE_AGENTS there while trialing, and raising it by hand is how a trial gets more.
export function activeAgentLimitFor(maxAgents: number | null, status: string | null | undefined): number | null {
    if (!isSubscriptionEntitled(status)) return 0
    return maxAgents
}
