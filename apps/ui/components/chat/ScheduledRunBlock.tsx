'use client'

import { AgentWorkspaceMessage } from '@/components/chat/AgentWorkspaceMessage'
import { ThreadDividerDialog } from '@/components/chat/ThreadDividerDialog'
import { ThreadDividerDot, ThreadDividerLine, ThreadDividerLink } from '@/components/chat/ThreadDividerLine'
import { CalendarClockIcon } from '@/lib/icons'
import { type ScheduledRun } from '@/lib/schedules/scheduled-run'
import { useState } from 'react'

// The routine speaks, not the user: a divider marks where it fired, its prompt one click away.
export function ScheduledRunBlock({ agentId, run }: { agentId: string | undefined; run: ScheduledRun }) {
    const [promptOpen, setPromptOpen] = useState(false)

    return (
        <>
            <ThreadDividerLine icon={<CalendarClockIcon className="size-3.5" />}>
                Scheduled run
                <ThreadDividerDot />
                <span className="min-w-0 truncate font-medium text-foreground">{run.name}</span>
                <ThreadDividerDot />
                <ThreadDividerLink onClick={() => setPromptOpen(true)}>View prompt</ThreadDividerLink>
            </ThreadDividerLine>
            <ThreadDividerDialog open={promptOpen} onOpenChange={setPromptOpen} icon={<CalendarClockIcon className="size-3.5 text-muted-foreground" />} title={`${run.name} prompt`}>
                <AgentWorkspaceMessage agentId={agentId}>{run.prompt}</AgentWorkspaceMessage>
            </ThreadDividerDialog>
        </>
    )
}
