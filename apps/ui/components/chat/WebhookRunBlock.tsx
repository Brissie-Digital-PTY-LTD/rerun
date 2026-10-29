'use client'

import { AgentWorkspaceMessage } from '@/components/chat/AgentWorkspaceMessage'
import { ThreadDividerDialog } from '@/components/chat/ThreadDividerDialog'
import { ThreadDividerDot, ThreadDividerLine, ThreadDividerLink } from '@/components/chat/ThreadDividerLine'
import { TriggerPayloadDetails, TriggerPayloadSummary } from '@/components/chat/TriggerPayloadBlock'
import { WebhookIcon } from '@/lib/icons'
import { type TriggerPayload } from '@/lib/triggers/trigger-payload'
import { useState } from 'react'

type OpenDialog = 'prompt' | 'payload' | null

// The webhook speaks, not the user: a divider marks where it fired, with its prompt and what the
// caller sent each one click away.
export function WebhookRunBlock({ agentId, payload }: { agentId: string | undefined; payload: TriggerPayload }) {
    const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
    const icon = <WebhookIcon className="size-3.5 text-muted-foreground" />
    const closeOn = (dialog: Exclude<OpenDialog, null>) => (open: boolean) => setOpenDialog(open ? dialog : null)

    return (
        <>
            <ThreadDividerLine icon={<WebhookIcon className="size-3.5" />}>
                Webhook received
                <ThreadDividerDot />
                <span className="min-w-0 truncate font-medium text-foreground">{payload.slug}</span>
                {payload.prompt && (
                    <>
                        <ThreadDividerDot />
                        <ThreadDividerLink onClick={() => setOpenDialog('prompt')}>View prompt</ThreadDividerLink>
                    </>
                )}
                <ThreadDividerDot />
                <ThreadDividerLink onClick={() => setOpenDialog('payload')}>View payload</ThreadDividerLink>
            </ThreadDividerLine>
            <ThreadDividerDialog open={openDialog === 'prompt'} onOpenChange={closeOn('prompt')} icon={icon} title={`${payload.slug} prompt`}>
                <AgentWorkspaceMessage agentId={agentId}>{payload.prompt}</AgentWorkspaceMessage>
            </ThreadDividerDialog>
            <ThreadDividerDialog
                open={openDialog === 'payload'}
                onOpenChange={closeOn('payload')}
                icon={icon}
                title={`${payload.slug} payload`}
                aside={
                    <span className="flex shrink-0 items-center gap-2">
                        <TriggerPayloadSummary payload={payload} />
                    </span>
                }
            >
                <TriggerPayloadDetails payload={payload} bodyClassName="max-h-none bg-muted" />
            </ThreadDividerDialog>
        </>
    )
}
