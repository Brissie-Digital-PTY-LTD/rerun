'use client'

import { cn } from '../cn'
import { TooltipLabeled } from '../Tooltip'
import { availabilityDot, availabilityHint, availabilityLabel } from './options'
import type { Expert } from './types'

// A client component so the dot is created on the client side of the boundary. Rendered from a
// server component, a large RSC payload can hand the tooltip trigger its child as a lazy chunk, and
// Radix Slot renders a lazy child as nothing on the server: the dot vanished and hydration failed.
export function ExpertAvailability({ availability, className }: { availability: Expert['availability']; className?: string }) {
    return (
        <TooltipLabeled label={`${availabilityLabel(availability)}: ${availabilityHint(availability)}`}>
            <span className={cn('inline-block size-2 shrink-0 rounded-full', availabilityDot(availability), className)} />
        </TooltipLabeled>
    )
}
