'use client'

import { RERUN_CLOUD } from '@rerun/cloud/edition'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ExternalLinkIcon, HammerIcon } from '@/lib/icons'
import { landingUrl } from '@/lib/site'
// The shim's `Hammer` is the pack's other drawing, a wide mallet that reads as furniture at this
// size. No second lucide name to file this one under, so it comes straight from the pack.

// A search that lands on nothing is the moment someone knows exactly what they wanted and the
// catalogue does not have it, which is the best moment to offer them the other side of it.
// A self-hosted install has no marketplace and starts with no template: it creates its own.
export function TemplateLibraryEmpty({ filtered, onScratch }: { filtered: boolean; onScratch?: () => void }) {
    if (!RERUN_CLOUD) {
        return (
            <EmptyState
                icon={HammerIcon}
                title={filtered ? 'No template matches these filters' : 'No template here yet'}
                description="Recruit a coworker, then save it as a template."
                action={
                    <Button variant="outline" size="sm" onClick={onScratch}>
                        Create New Coworker
                    </Button>
                }
                className="pt-8"
            />
        )
    }

    return (
        <EmptyState
            icon={HammerIcon}
            title={filtered ? 'No template matches these filters' : 'No template here yet'}
            description="Build it yourself and sell it on Rerun."
            action={
                <Button asChild variant="outline" size="sm">
                    {/* The glyph stays raw rather than going through Icon: its decorative box is
                        size-8 and would tower over a sm button. */}
                    <a href={landingUrl('/community/experts/program')} target="_blank" rel="noreferrer">
                        Become a Rerun expert
                        <ExternalLinkIcon className="size-4" />
                    </a>
                </Button>
            }
            className="pt-8"
        />
    )
}
