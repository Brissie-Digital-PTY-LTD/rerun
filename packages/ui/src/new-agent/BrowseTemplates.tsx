'use client'

import { Button } from '../primitives/button'
import { LayoutGridIcon } from '../icons'
import { cn } from '../cn'

// The other way in, under the picks: either one of the agents picked for you, or a ready-made team
// from the library. A short "or" between two short rules says they are alternatives without drawing
// one more line across the whole dialog.
export function BrowseTemplates({ onBrowse, className }: { onBrowse: () => void; className?: string }) {
    return (
        <div className={cn('flex flex-col items-center gap-4', className)}>
            <div className="flex w-full max-w-60 items-center gap-3">
                <span className="h-px flex-1 bg-linear-to-r from-transparent to-border" />
                <span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Or</span>
                <span className="h-px flex-1 bg-linear-to-l from-transparent to-border" />
            </div>
            <Button type="button" variant="outline" data-aim="templates" onClick={onBrowse}>
                <LayoutGridIcon />
                Browse templates
            </Button>
        </div>
    )
}
