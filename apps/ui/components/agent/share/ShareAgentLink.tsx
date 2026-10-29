'use client'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { CheckIcon, CopyIcon } from '@/lib/icons'
import { useCopy } from '@/lib/use-copy'

export function ShareAgentLink({ url, reused }: { url: string; reused: boolean }) {
    const { copied, copy } = useCopy()

    return (
        <Field
            label="Share link"
            helperText={
                reused
                    ? 'A link with these same answers already existed for this coworker, so here it is rather than a second copy.'
                    : 'Anyone holding this link can add a copy of this coworker to their own board. Revoke it whenever you want.'
            }
        >
            <div className="flex items-center gap-1.5">
                <code className="flex h-8 min-w-0 flex-1 items-center truncate rounded-md border border-input bg-muted/40 px-3 font-mono text-xs">{url}</code>
                <Button size="icon-sm" variant="outline" aria-label="Copy the share link" onClick={() => copy(url)}>
                    {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
                </Button>
            </div>
        </Field>
    )
}
