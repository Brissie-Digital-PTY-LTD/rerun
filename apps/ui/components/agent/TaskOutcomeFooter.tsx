'use client'

import { Badge } from '@rerun/ui/primitives'

import type { TaskOutcome } from '@/lib/schedules/outcomes'
import { shortRelativeTime } from '@/lib/time'

// How a scheduled task or a trigger last ended, under its row. Without an outcome in the recent runs,
// the last start the engine recorded is all there is.
export function TaskOutcomeFooter({ outcome, lastStartedAt }: { outcome: TaskOutcome | undefined; lastStartedAt: string | null | undefined }) {
    if (!outcome) return lastStartedAt ? <>last run {shortRelativeTime(lastStartedAt)} ago</> : <>Never ran</>
    const failed = outcome.status === 'error'
    return (
        <span className="flex items-center gap-1.5">
            <Badge size="xs" tone={failed ? 'red' : 'green'} glow={false}>
                {failed ? 'Failed' : 'Done'}
            </Badge>
            <span className="tabular-nums">{shortRelativeTime(outcome.finishedAt)}</span>
        </span>
    )
}
