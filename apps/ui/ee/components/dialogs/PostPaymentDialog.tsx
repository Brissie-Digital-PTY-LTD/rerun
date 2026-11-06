'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { isSubscriptionEntitled } from '@/ee/lib/billing/entitlement'
import { useStartPending } from '@/lib/onboarding/useStartPending'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { useSession } from '@/supabase/session/SessionProvider'
import { Loader2Icon } from '@/lib/icons'
import { useState } from 'react'

// Template titles are editorial and unbounded, so they are clamped before reaching a button.
function short(title: string): string {
    return title.length > 40 ? `${title.slice(0, 39)}…` : title
}

// Shown when the user returns from Stripe checkout with something parked: a first-agent draft, or a
// template opened through a shared link. Once the subscription is live (webhook applied the plan,
// surfaced via realtime), starting claims a Space from the pool and lands the parked work inside it.
export function PostPaymentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { workspace } = useSession()
    const startPending = useStartPending()
    const pendingTemplate = useOnboardingStore(s => s.pendingTemplate)
    const [starting, setStarting] = useState(false)

    // The plan is applied by the Stripe webhook, which can land a moment after the redirect. We wait
    // for it to flow in (realtime) before letting the user start, so the claim isn't gated.
    const subscriptionReady = isSubscriptionEntitled(workspace?.subscription_status)

    const handleStart = async () => {
        if (!workspace || starting) return
        setStarting(true)
        try {
            await startPending()
            onOpenChange(false)
        } catch {
            setStarting(false)
        }
    }

    // Une template parkée depuis sa fiche n'a jamais été placée : la suite est le board, pas une
    // installation qui se ferait toute seule.
    const needsPlacement = !!pendingTemplate?.needsPlacement
    const readyDescription = pendingTemplate
        ? needsPlacement
            ? `Your plan is active. Place "${short(pendingTemplate.title)}" on your board.`
            : `Your plan is active. Ready to set up "${short(pendingTemplate.title)}"?`
        : 'Your plan is active. Ready to bring your first coworker to life?'
    const subject = pendingTemplate && pendingTemplate.agentCount > 1 ? `your ${pendingTemplate.agentCount} coworkers` : 'your coworker'
    const verb = needsPlacement ? { idle: 'Place', busy: 'Placing' } : { idle: 'Start', busy: 'Starting' }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>You&apos;re all set</DialogTitle>
                    <DialogDescription>{subscriptionReady ? readyDescription : 'Finalizing your subscription, this only takes a moment.'}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={handleStart} disabled={!subscriptionReady || starting}>
                        {(starting || !subscriptionReady) && <Loader2Icon className="size-4 animate-spin" />}
                        {starting ? `${verb.busy} ${subject}` : subscriptionReady ? `${verb.idle} ${subject}` : 'Finalizing subscription'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
