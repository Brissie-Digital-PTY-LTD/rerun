'use client'

import { Button } from '../primitives'
import { cn } from '../cn'
import { ChevronLeft, ChevronRight } from '../icons'

type StepDotsProps = {
    count: number
    current: number
    answered: boolean[]
    onSelect: (index: number) => void
    /** The last step that can be opened. Every step by default; lower it to forbid skipping ahead. */
    reachable?: number
    disabled?: boolean
    className?: string
}

export function StepDots({ count, current, answered, onSelect, reachable = count - 1, disabled, className }: StepDotsProps) {
    return (
        <div className={cn('flex items-center', className)}>
            <Button size="icon-sm" variant="ghost" disabled={disabled || current === 0} onClick={() => onSelect(current - 1)} aria-label="Previous step" className="-my-1 text-muted-foreground">
                <ChevronLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-1">
                {Array.from({ length: count }, (_, i) => {
                    const isCurrent = i === current
                    return (
                        <button
                            key={i}
                            type="button"
                            disabled={disabled || i > reachable}
                            onClick={() => onSelect(i)}
                            aria-label={`Go to step ${i + 1}`}
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                                'size-2 shrink-0 rounded-full transition-colors disabled:pointer-events-none',
                                isCurrent
                                    ? 'border border-foreground ring-1 ring-foreground/50 ring-offset-2 ring-offset-background'
                                    : answered[i]
                                      ? 'bg-foreground hover:bg-foreground/80'
                                      : 'border border-muted-foreground/40 hover:border-foreground/60',
                            )}
                        />
                    )
                })}
            </div>
            <Button size="icon-sm" variant="ghost" disabled={disabled || current >= reachable} onClick={() => onSelect(current + 1)} aria-label="Next step" className="-my-1 text-muted-foreground">
                <ChevronRight className="size-4" />
            </Button>
        </div>
    )
}
