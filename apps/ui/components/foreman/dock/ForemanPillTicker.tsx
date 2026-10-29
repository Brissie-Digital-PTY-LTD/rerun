'use client'

import { TextShimmer } from '@rerun/ui'

import { TextLoop } from '@/components/ui/text-loop'
import { loadingLabels } from '@/lib/agent-chat-loader'

/** The run, one line at a time, where the field was: the same line the chat's own loader shows. */
export function ForemanPillTicker({ label }: { label: string | null }) {
    return (
        <span role="status" className="flex h-full min-w-0 flex-1 items-center overflow-hidden">
            {label ? (
                <TextShimmer className="max-w-full truncate text-sm">{label}</TextShimmer>
            ) : (
                <TextLoop className="text-sm" interval={2.5}>
                    {loadingLabels.map(loading => (
                        <TextShimmer key={loading}>{loading}</TextShimmer>
                    ))}
                </TextLoop>
            )}
        </span>
    )
}
