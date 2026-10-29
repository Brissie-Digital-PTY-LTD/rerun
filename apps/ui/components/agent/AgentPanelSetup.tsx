'use client'

import { isSetupAnswered } from '@rerun/contracts'
import { getAgentDetailAction, updateAgentConfigAction } from '@/app/api/_actions/agent.actions'
import { invalidateAgentContext } from '@/hooks/useAgentContext'
import { AgentSetupFields, type AgentSetupDraft } from '@/components/agent/AgentSetupFields'
import { Button } from '@/components/ui/button'
import { SkeletonForm } from '@/components/ui/skeleton'
import { CheckIcon, Loader2Icon } from '@/lib/icons'
import { useEffect, useState } from 'react'

export function AgentPanelSetup({ agentId }: { agentId: string }) {
    const [draft, setDraft] = useState<AgentSetupDraft>({ required: null, prompt: '' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getAgentDetailAction(agentId)
            .then(detail => {
                if (cancelled) return
                if (!detail) {
                    setError('Could not reach the engine for this coworker.')
                    return
                }
                setDraft({ required: detail.config.setup.required, prompt: detail.install })
            })
            .catch(() => !cancelled && setError('Could not reach the engine for this coworker.'))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [agentId])

    const save = async () => {
        setError(null)
        setSaving(true)
        // The author never installs their own agent, so it is marked done here and now. Only the
        // copy an import creates starts pending, which is what puts the button in front of a buyer.
        const result = await updateAgentConfigAction(agentId, {
            setup: { required: draft.required, completedAt: new Date().toISOString() },
            install: draft.required ? draft.prompt : '',
        })
        setSaving(false)
        if (!result.success) {
            setError(result.error ?? 'Failed to save')
            return
        }
        invalidateAgentContext(agentId)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-4 p-4">
                <SkeletonForm />
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <p className="text-xs text-muted-foreground">
                A copy of this agent arrives on someone else&apos;s account with no credentials and nothing connected. These instructions are what it runs, on its own, the first time they open it.
            </p>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <AgentSetupFields value={draft} onChange={setDraft} disabled={saving} />

            <Button type="button" size="sm" onClick={save} disabled={saving || !isSetupAnswered(draft)} className="w-full">
                {saved ? (
                    <>
                        <CheckIcon className="mr-1.5 size-3.5 text-emerald-500" /> Saved
                    </>
                ) : saving ? (
                    <>
                        <Loader2Icon className="mr-1.5 size-3.5 animate-spin" /> Saving...
                    </>
                ) : (
                    'Save'
                )}
            </Button>
        </div>
    )
}
