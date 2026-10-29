'use client'

import { track } from '@rerun/analytics/client'
import { TRIAL_DAYS } from '@rerun/contracts'
import { useEffect, useState } from 'react'

import { AuthDialog } from '@/components/dialogs/AuthDialog'
import { ForemanSignInLink } from '@/components/foreman/ForemanSignInLink'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Check, Users } from '@/lib/icons'
import { intakeBoxes } from '@/lib/onboarding/intake'
import { siteDomain } from '@/lib/onboarding/site-favicon'
import { useOnboardingStore } from '@/stores/onboarding.store'

const PERKS = [`${TRIAL_DAYS}-day free trial`, 'Cancel anytime', 'Your answers are kept']

// Le pied de la colonne quand un anonyme a répondu à la carte d'accueil : rien ne peut partir vers
// le Foreman sans compte, donc le composer cède la place au seul geste qui reste. La dialog ne
// s'ouvre que sur ce clic, et se referme sans rien perdre : le bouton est toujours là.
export function ForemanSignupGate() {
    const [open, setOpen] = useState(false)
    const pendingIntake = useOnboardingStore(state => state.pendingIntake)
    const domain = pendingIntake?.companyUrl ? siteDomain(pendingIntake.companyUrl) : null
    const boxes = intakeBoxes(pendingIntake?.industry ?? pendingIntake?.decidedIndustry)

    useEffect(() => {
        track('signup_gate_viewed', { surface: 'foreman_intake' })
    }, [])

    return (
        <div className="pb-2">
            <div className="mb-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                    <Icon icon={Users} size="sm" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{domain ? `Your team at ${domain}` : 'Your team'}</p>
                        <p className="truncate text-xs text-muted-foreground">{boxes.join(' · ')}</p>
                    </div>
                </div>

                <ul className="mt-3 space-y-1.5 px-1">
                    {PERKS.map(perk => (
                        <li key={perk} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="size-3.5 shrink-0 text-foreground" />
                            {perk}
                        </li>
                    ))}
                </ul>

                <Button size="lg" className="mt-3 w-full" onClick={() => setOpen(true)}>
                    Create my account
                </Button>
            </div>

            <ForemanSignInLink />

            <AuthDialog variant="build" open={open} onOpenChange={setOpen} />
        </div>
    )
}
