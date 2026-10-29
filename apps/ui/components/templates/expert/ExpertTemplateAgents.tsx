'use client'

import { useTransition } from 'react'
import { Badge, type BadgeTone } from '@rerun/ui/primitives'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Download, Trash2Icon } from '@/lib/icons'
import type { ExpertTemplateAgent } from '@/lib/templates/expert'

// The answer is given on the agent itself, in its Install tab or during the capture review. Here it
// is only reported, because it is what a submission is blocked on.
const SETUP_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
    true: { label: 'Guided install', tone: 'brand' },
    false: { label: 'No install', tone: 'neutral' },
    null: { label: 'Install answer missing', tone: 'orange' },
}

// An agent is here because a capture archived its folder: it is never hand-authored, only captured
// and removed. Everything is `type="button"` so the block can live inside the editor form without
// submitting it.
export function ExpertTemplateAgents({
    agents,
    readOnly,
    onCapture,
    onRemove,
}: {
    agents: ExpertTemplateAgent[]
    readOnly: boolean
    onCapture: () => void
    onRemove: (agentKey: string) => Promise<boolean>
}) {
    const [pending, startTransition] = useTransition()

    return (
        <Field label={`Coworkers (${agents.length})`}>
            <div className="flex flex-col gap-2">
                {agents.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                        No coworker captured yet. Capture one from your sandbox so people can install this setup.
                    </p>
                ) : (
                    agents.map(agent => (
                        <div key={agent.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm">{agent.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {agent.role || 'No role yet'}
                                    {agent.connectorSlugs.length > 0 &&
                                        ` · ${agent.connectorSlugs.length} ${agent.connectorSlugs.length === 1 ? 'connector' : 'connectors'}`}
                                </span>
                            </div>

                            <Badge size="xs" glow={false} tone={SETUP_BADGE[String(agent.setupRequired)].tone} className="ml-auto shrink-0">
                                {SETUP_BADGE[String(agent.setupRequired)].label}
                            </Badge>

                            {!readOnly && (
                                <ConfirmDialog
                                    title={`Remove ${agent.name}?`}
                                    description="The archive captured from its folder is deleted too. Adding the coworker back means capturing it again."
                                    confirmLabel="Remove"
                                    onConfirm={() =>
                                        startTransition(async () => {
                                            await onRemove(agent.key)
                                        })
                                    }
                                >
                                    <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="ghost"
                                        disabled={pending}
                                        title={`Remove ${agent.name}`}
                                        aria-label={`Remove ${agent.name}`}
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2Icon className="size-3.5" />
                                    </Button>
                                </ConfirmDialog>
                            )}
                        </div>
                    ))
                )}

                {!readOnly && (
                    <>
                        <Button type="button" size="sm" variant="secondary" onClick={onCapture} className="self-start">
                            <Download className="size-3.5" />
                            Capture from your sandbox
                        </Button>
                        {agents.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Removing a coworker also deletes the archive captured from its folder. Adding it back means capturing it again.
                            </p>
                        )}
                    </>
                )}
            </div>
        </Field>
    )
}
