'use client'

import type { ReactNode } from 'react'

import { RERUN_CLOUD } from '@/cloud/edition'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { ArrowLeftIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

import { RerunGlyph } from './offer-plans'

export function OfferFooter({ onBack, children }: { onBack?: () => void; children: ReactNode }) {
    return (
        <DialogFooter className={cn('-mx-6 -mb-6 mt-auto border-t bg-muted/50 px-6 py-4 sm:-mx-8 sm:-mb-8 sm:items-center sm:px-8', onBack && 'sm:justify-between')}>
            {onBack && (
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeftIcon />
                    Back
                </Button>
            )}
            {children}
        </DialogFooter>
    )
}

// The decline sits apart from the ways in, on the far side of the footer.
export function DeclineButton({ onClick }: { onClick: () => void }) {
    return (
        <Button variant="destructive" onClick={onClick}>
            <RerunGlyph className="size-3.5" />
            {RERUN_CLOUD ? "I'd rather stay on Rerun credits" : "I'd rather stay on OpenRouter"}
        </Button>
    )
}
