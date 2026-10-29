'use client'

import { SkillProposalBlock as SkillProposalBlockBase } from '@rerun/ui/chat'
import { useBoardStore } from '@/stores/board.store'
import type { EngineSkillProposal } from '@/lib/engine/types'

export type SkillProposalBlockProps = {
    agentId?: string
    proposal: EngineSkillProposal
    pending?: boolean
    pinned?: boolean
    onDecide?: (proposalId: string, decision: 'accept' | 'dismiss') => void
}

export function SkillProposalBlock({ agentId, proposal, pending, pinned, onDecide }: SkillProposalBlockProps) {
    const openAgentSkill = useBoardStore(s => s.openAgentSkill)
    const decidable = Boolean(onDecide)
    const appliedSlug = proposal.appliedSlug

    return (
        <SkillProposalBlockBase
            mode={proposal.mode}
            title={proposal.title}
            summary={proposal.summary}
            state={proposal.status}
            count={proposal.instructions.length}
            instructions={proposal.instructions}
            error={proposal.error}
            pending={pending}
            pinned={pinned}
            onAccept={decidable ? () => onDecide?.(proposal.id, 'accept') : undefined}
            onDismiss={decidable ? () => onDecide?.(proposal.id, 'dismiss') : undefined}
            onOpenSkill={agentId && appliedSlug ? () => openAgentSkill(agentId, appliedSlug) : undefined}
        />
    )
}
