'use client'

import { Markdown } from '@rerun/ui/markdown'

import type { ChangelogEntryView } from '@/app/api/_actions/changelog.actions'
import { DialogTitle } from '@/components/ui/dialog'

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export function ChangelogEntrySlide({ entry }: { entry: ChangelogEntryView }) {
    return (
        <div className="flex flex-col pt-2 sm:pt-6">
            <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">What&apos;s new · {DATE_FORMAT.format(new Date(entry.publishedAt))}</p>
            <DialogTitle className="mt-4 font-heading text-2xl leading-tight font-medium text-balance sm:text-3xl">{entry.title}</DialogTitle>
            <Markdown content={entry.bodyMd} className="mt-4 text-sm text-muted-foreground sm:text-base" />
        </div>
    )
}
