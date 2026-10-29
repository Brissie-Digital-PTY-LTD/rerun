'use client'

import { BrainIcon } from '@/lib/icons'
import { useWorkspaceSettingsStore } from '@/stores/workspace-settings.store'
import { Button, Icon } from '@rerun/ui/primitives'

// What an agent leaves in the conversation when it proposes a change to the company brain. The
// decision itself happens in the Brain, next to every other pending change and its diff.
export function BrainProposalBlock({ title, mode }: { title: string; mode: 'create' | 'edit' }) {
    const openKnowledgeBase = useWorkspaceSettingsStore(s => s.openKnowledgeBase)

    return (
        <div className="rounded-xl bg-muted/30 px-1.5 py-1.5">
            <div className="flex items-center gap-3 text-sm">
                <Icon size="sm" icon={BrainIcon} />
                <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{mode === 'create' ? `New Brain page: ${title}` : `Change to the Brain: ${title}`}</span>
                    <span className="block truncate text-xs text-muted-foreground">Proposed for review. Nothing changes until someone accepts it.</span>
                </div>
                <Button size="xs" variant="ghost" onClick={() => openKnowledgeBase('proposals')}>
                    Review
                </Button>
            </div>
        </div>
    )
}
