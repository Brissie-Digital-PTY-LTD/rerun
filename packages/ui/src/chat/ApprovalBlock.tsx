'use client'

import { Button, ScrollFade } from '../primitives'
import { cn } from '../cn'
import { ShieldAlertIcon, type LucideIcon } from '../icons'
import { brandIconFilter } from '../brand-icon'
import type { ReactNode } from 'react'

export type ApprovalChoice = 'once' | 'session' | 'always' | 'deny'

export const APPROVAL_CHOICES: { value: ApprovalChoice; label: string; variant: 'default' | 'outline' | 'destructive' }[] = [
    { value: 'once', label: 'Allow once', variant: 'default' },
    { value: 'session', label: 'This session', variant: 'outline' },
    { value: 'always', label: 'Always', variant: 'outline' },
    { value: 'deny', label: 'Deny', variant: 'destructive' },
]

export type ApprovalBlockProps = {
    label: string
    icon?: LucideIcon
    // A connector tool identifies itself by its brand logo, which is an image and not a glyph.
    iconSrc?: string
    message?: string
    preview?: string
    responded?: ApprovalChoice | null
    loading?: boolean
    onChoose: (choice: ApprovalChoice) => void
    renderText?: (text: string) => ReactNode
    className?: string
}

export function ApprovalBlock({ label, icon: ToolIcon, iconSrc, message, preview, responded, loading, onChoose, renderText = text => text, className }: ApprovalBlockProps) {
    return (
        <div className={cn('rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2', className)}>
            <div className="flex items-center gap-2 text-sm">
                <ShieldAlertIcon className="size-4 shrink-0 text-amber-400" />
                {iconSrc ? (
                    <img src={iconSrc} alt="" aria-hidden className="size-3.5 shrink-0 object-contain" style={{ filter: brandIconFilter(iconSrc) }} />
                ) : (
                    ToolIcon && <ToolIcon className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="font-medium text-foreground">Approval required: {label}</span>
            </div>

            {message && <ScrollFade className="max-h-[20vh] text-xs text-muted-foreground">{renderText(message)}</ScrollFade>}

            {preview && (
                <ScrollFade className="max-h-[22vh] rounded bg-background">
                    <code className="block whitespace-pre-wrap break-all px-2 py-1.5 text-xs font-mono text-foreground">{preview}</code>
                </ScrollFade>
            )}

            {responded ? (
                <p className="text-xs text-muted-foreground">
                    Responded: <span className="font-medium">{responded}</span>
                </p>
            ) : (
                <div className="flex items-center gap-2">
                    {APPROVAL_CHOICES.map(({ value, label, variant }) => (
                        <Button key={value} size="sm" variant={variant} disabled={loading} onClick={() => onChoose(value)} data-hitl={value}>
                            {label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    )
}
