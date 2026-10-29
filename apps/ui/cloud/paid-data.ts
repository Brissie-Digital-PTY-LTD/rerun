import type { PaidDataCapability } from '@rerun/contracts'

import { CoinsIcon, type LucideIcon } from '@/lib/icons'

// No paid data here: no call ever names a capability, and no turn runs out of a credit.
export function turnRanOutOfPaidCredit(_messages: readonly unknown[]): boolean {
    return false
}

export function paidDataIcon(_capability: PaidDataCapability): LucideIcon {
    return CoinsIcon
}
