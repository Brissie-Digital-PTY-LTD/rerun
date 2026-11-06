'use client'

import { useEffect, useState } from 'react'

import { previewPlanChangeAction } from '@/ee/actions/billing.actions'
import type { PlanQuote, PlanSelection } from '@/ee/services/billing.service'

const QUOTE_DEBOUNCE_MS = 250

// What Stripe would charge today for a selection, re-asked as the slider settles. 'loading' until
// the answer for this very selection is in, so a quote never stands for the previous one. A failed
// preview reads as no quote: the dialog falls back on the list price rather than blocking.
export function usePlanQuote(selection: PlanSelection, enabled: boolean): PlanQuote | null | 'loading' {
    const key = JSON.stringify(selection)
    const [answer, setAnswer] = useState<{ key: string; quote: PlanQuote | null } | null>(null)

    useEffect(() => {
        if (!enabled) return
        let cancelled = false
        const timer = setTimeout(async () => {
            const result = await previewPlanChangeAction(JSON.parse(key) as PlanSelection)
            if (!cancelled) setAnswer({ key, quote: result.ok ? result.quote : null })
        }, QUOTE_DEBOUNCE_MS)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [key, enabled])

    if (!enabled) return null
    return answer?.key === key ? answer.quote : 'loading'
}
