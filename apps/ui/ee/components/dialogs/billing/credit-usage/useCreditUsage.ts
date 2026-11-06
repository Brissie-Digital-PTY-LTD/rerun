'use client'

import { useEffect, useState } from 'react'

import { getCreditUsageAction } from '@/ee/actions/billing.actions'
import { addOneMonth } from '@/ee/lib/billing/cancel-flow'
import { creditBalance, type CreditBalance, type CreditUsage } from '@/ee/lib/billing/credit-usage'
import { useSession } from '@/supabase/session/SessionProvider'

export type CreditUsageState = {
    // null while the split is loading: the figures come from the workspace row, only the split waits.
    balance: CreditBalance | null
    usage: CreditUsage | null
    loading: boolean
    trial: boolean
    resetsOn: Date | null
    // A member paused the credit: the hub refuses every Rerun model and paid data call until it is resumed.
    paused: boolean
}

// Read once when a billing dialog opens: the card under the plan and the usage pane share it.
export function useCreditUsage({ enabled = true }: { enabled?: boolean } = {}): CreditUsageState {
    const { workspace } = useSession()
    const [usage, setUsage] = useState<CreditUsage | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!enabled) return
        let cancelled = false
        getCreditUsageAction().then(result => {
            if (cancelled) return
            if (result.ok) setUsage(result.usage)
            setLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [enabled])

    const columns = { budgetMicros: workspace?.rerun_budget_micros ?? 0, usedMicros: workspace?.rerun_used_micros ?? 0, topupMicros: workspace?.rerun_topup_micros ?? 0 }
    const anchor = workspace?.rerun_period_anchor
    return {
        balance: loading ? null : creditBalance(columns, usage),
        usage,
        loading,
        trial: workspace?.subscription_status === 'trialing',
        resetsOn: anchor ? addOneMonth(new Date(anchor)) : null,
        paused: !!workspace?.rerun_credit_paused_at,
    }
}
