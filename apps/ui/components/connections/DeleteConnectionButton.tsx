'use client'

import { getAiConnectionUsageAction } from '@/app/api/_actions/workspace-connection.actions'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Button } from '@/components/ui/button'
import type { BoxConnection, BoxConnectionUsage } from '@/lib/engine/types'
import { Trash2Icon } from '@/lib/icons'
import { useState } from 'react'
import { toast } from 'sonner'

export type DeleteResult = { success: true; released: BoxConnectionUsage } | { success: false; error: string }

type DeleteConnectionButtonProps = {
    connection: BoxConnection
    onDelete: (id: string) => Promise<DeleteResult>
    onDeleted: () => void
}

// Deleting a connection lives here, at the bottom of its detail view, rather than in the grid:
// nothing destructive should sit one stray click away from a list you only meant to scan.
export function DeleteConnectionButton({ connection, onDelete, onDeleted }: DeleteConnectionButtonProps) {
    const [usage, setUsage] = useState<BoxConnectionUsage | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [pending, setPending] = useState(false)

    const remove = async () => {
        setPending(true)
        const result = await onDelete(connection.id)
        setPending(false)
        if (!result.success) {
            setError(result.error ?? 'Failed to delete the connection')
            return
        }
        toast.success(`${connection.name} removed`, { description: describeReleased(result.released) })
        onDeleted()
    }

    return (
        <div className="space-y-2">
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            <ConfirmDialog title={`Remove ${connection.name}?`} confirmLabel="Remove" description={describeUsage(usage)} pending={pending} onConfirm={() => void remove()}>
                <Button type="button" size="sm" variant="destructive" onClick={() => void getAiConnectionUsageAction(connection.id).then(setUsage)}>
                    <Trash2Icon />
                    Remove {connection.name}
                </Button>
            </ConfirmDialog>
        </div>
    )
}

function movers(usage: BoxConnectionUsage): string[] {
    const parts: string[] = []
    if (usage.agents.length > 0) parts.push(usage.agents.map(a => a.name).join(', '))
    if (usage.automations.length > 0) parts.push(usage.automations.length === 1 ? '1 automation' : `${usage.automations.length} automations`)
    return parts
}

// The engine never refuses the delete: it moves everything that named the connection back onto the
// Box default first. So this announces what is about to move, not what to go fix by hand.
function describeUsage(usage: BoxConnectionUsage | null): string {
    if (!usage) return 'Checking what still runs on it…'
    const moved = movers(usage)
    const sentences = moved.length > 0 ? [`${moved.join(' and ')} will fall back to the workspace default model.`] : []
    // The Box default is not a pointer anything holds by name, so it has to be named on its own.
    if (usage.isBoxDefault) sentences.push('It holds the workspace default model, which is cleared: every coworker that picked none falls back to Rerun.')
    if (sentences.length === 0) return 'The credential is removed from the Box. Nothing runs on it.'
    return sentences.join(' ')
}

function describeReleased(usage: BoxConnectionUsage): string | undefined {
    const moved = movers(usage)
    const sentences = moved.length > 0 ? [`${moved.join(' and ')} now run on the workspace default model.`] : []
    if (usage.isBoxDefault) sentences.push('The workspace default was cleared.')
    return sentences.length > 0 ? sentences.join(' ') : undefined
}
