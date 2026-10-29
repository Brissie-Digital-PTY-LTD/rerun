'use client'

import { FOREMAN_AGENT_ID } from '@rerun/contracts'

import { ModelPillTrigger } from '@/components/agent/ModelPillTrigger'
import { ModelSelector } from '@/components/agent/ModelSelector'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import type { ForemanBackend } from '@/lib/foreman/phase'
import { useForemanStore } from '@/stores/foreman.store'

// The hub foreman runs on the shared Rerun key: the subscriptions plugged into the machine never
// leave it, so its pill is disabled rather than hidden and still says which model is answering. The
// engine foreman picks its model like any agent of the Box.
const HUB_REASON = 'This chat always runs on Rerun Balanced'

// The column stays mounted while closed, and a picker reads the foreman from the Box and the
// machine's connections on mount: nothing to read for a pill nobody can see.
export function ForemanModelPill({ backend }: { backend: ForemanBackend }) {
    const open = useForemanStore(state => state.open)
    if (backend === 'engine') return open === true ? <ModelSelector agentId={FOREMAN_AGENT_ID} /> : null
    return (
        <TooltipDisabledReason reason={HUB_REASON}>
            <ModelPillTrigger provider="rerun" label="Rerun Balanced" disabled />
        </TooltipDisabledReason>
    )
}
