'use client'

import { track } from '@rerun/analytics/client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { isSubscriptionEntitled } from '@/ee/lib/billing/entitlement'
import { useTemplateImportFlow } from '@/lib/templates/useTemplateImportFlow'
import { useBillingStore } from '@/stores/billing.store'
import { useSession } from '@/supabase/session/SessionProvider'
import { useAwaitTemplatePurchase } from './useAwaitTemplatePurchase'

// The twin of PostPaymentDialog, for a marketplace purchase rather than a plan. Same contract: wait
// for the asynchronous half to land before enabling the button, never let the user press something
// that will fail.
//
// Nothing was mid-placement when the user left for Stripe: the buy CTA fires before
// `beginTemplatePlacement`, so "resuming" here means starting that handover for the first time,
// exactly as the library CTA would have.
export function TemplatePurchaseSuccessDialog({ slug, sessionId, onOpenChange }: { slug: string; sessionId: string | null; onOpenChange: (open: boolean) => void }) {
    const { workspace } = useSession()
    const openBilling = useBillingStore(store => store.openBilling)
    const { state, template } = useAwaitTemplatePurchase(slug, sessionId)
    const { run } = useTemplateImportFlow({ onDone: () => onOpenChange(false) })

    useEffect(() => {
        if (state === 'ready') track('template_purchase_completed', { slug })
    }, [state, slug])

    const entitled = isSubscriptionEntitled(workspace?.subscription_status)
    const agentCount = template?.archiveAgentNames.length ?? 0
    const title = template?.title ?? 'your template'

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Thank you for your purchase</DialogTitle>
                    <DialogDescription>
                        {state === 'waiting'
                            ? 'Finalizing your purchase, this only takes a moment.'
                            : state === 'timeout'
                              ? 'Your payment went through. It is taking longer than usual to appear, refresh in a moment.'
                              : entitled
                                ? `You own "${title}". Ready to place ${agentCount === 1 ? 'its coworker' : `its ${agentCount} coworkers`}?`
                                : `You own "${title}". An active Rerun plan is required to install it.`}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    {state === 'waiting' ? (
                        <Button loading disabled>
                            Finalizing purchase
                        </Button>
                    ) : state === 'timeout' ? (
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    ) : entitled ? (
                        <Button disabled={!template || agentCount === 0} onClick={() => template && run(template)}>
                            {agentCount === 1 ? 'Place its coworker' : `Place ${agentCount} coworkers`}
                        </Button>
                    ) : (
                        <Button onClick={() => openBilling(undefined, 'template_purchase')}>Subscribe</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
