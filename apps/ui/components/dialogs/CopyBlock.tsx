'use client'

import { Button } from '@/components/ui/button'
import { CheckIcon, CopyIcon } from '@/lib/icons'
import { useCopy } from '@/lib/use-copy'
import { cn } from '@/lib/utils'

// The CopyLine of multi-line values: a config someone pastes into a file keeps its indentation, so
// it gets a block with the button in the corner rather than a row.
export function CopyBlock({ value, label, className }: { value: string; label: string; className?: string }) {
    const { copied, copy } = useCopy()

    return (
        <div className={cn('relative min-w-0 rounded-md border border-input bg-muted/40', className)}>
            <pre className="no-scrollbar overflow-x-auto py-2.5 pr-11 pl-3 font-mono text-xs leading-5 whitespace-pre">{value}</pre>
            <Button size="icon-sm" variant="ghost" aria-label={label} onClick={() => copy(value)} className="absolute top-1.5 right-1.5">
                {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
            </Button>
        </div>
    )
}
