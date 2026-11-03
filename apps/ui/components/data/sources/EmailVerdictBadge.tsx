'use client'

import type { EmailVerdictStatus } from '@rerun/contracts'
import { Badge, type BadgeTone } from '@rerun/ui/primitives'

export const EMAIL_VERDICTS: Record<EmailVerdictStatus, { label: string; detail: string; tone: BadgeTone }> = {
    verified: { label: 'Verified', detail: 'Mailbox exists', tone: 'green' },
    unconfirmed: { label: 'Unconfirmed', detail: 'Mailbox not confirmed', tone: 'orange' },
    invalid: { label: 'Invalid', detail: 'Mailbox does not exist', tone: 'red' },
}

export function EmailVerdictBadge({ status, className }: { status: EmailVerdictStatus; className?: string }) {
    const { label, tone } = EMAIL_VERDICTS[status]
    return (
        <Badge size="xs" tone={tone} glow={false} className={className}>
            {label}
        </Badge>
    )
}
