'use client'

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { LockIcon } from '@/lib/icons'
import { useBillingStore } from '@/stores/billing.store'
import type { ReactNode } from 'react'

type TemplateContentLockProps = {
    locked: boolean
    // What is being withheld, as it reads in "Its skills stay sealed…".
    subject: string
    children: ReactNode
}

// The seal, as the user meets it: the filler the server sent, blurred, under a card that names the
// one thing that opens it. The real content is not in the DOM to begin with, so the blur is the
// appearance of the lock and never the lock itself.
export function TemplateContentLock({ locked, subject, children }: TemplateContentLockProps) {
    const openBilling = useBillingStore(s => s.openBilling)

    if (!locked) return <>{children}</>

    return (
        <div className="relative isolate">
            <div aria-hidden className="pointer-events-none select-none blur-[3px] opacity-70">
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <Icon size="lg" icon={LockIcon} className="text-muted-foreground" />
                <div className="space-y-1.5">
                    <p className="text-sm font-medium">Locked while you are on the trial</p>
                    <p className="text-xs text-muted-foreground">This coworker came from a template. Its {subject} unlocks once your workspace is on a paid plan.</p>
                </div>
                <Button size="sm" variant="outline" highlight onClick={() => openBilling(undefined, 'template_content')}>
                    Upgrade to unlock
                </Button>
            </div>
        </div>
    )
}
