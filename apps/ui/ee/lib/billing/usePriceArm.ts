'use client'

import { parsePriceArm, type PriceArm } from '@/ee/lib/billing/plans'
import { useSession } from '@/supabase/session/SessionProvider'

// The price the current workspace is sold the base plan at. For every surface that quotes it before
// there is a subscription; once there is one, the plan dialog reads the arm off the subscription.
export function usePriceArm(): PriceArm {
    return parsePriceArm(useSession().workspace?.price_arm)
}
