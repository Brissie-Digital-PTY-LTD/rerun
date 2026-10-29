'use client'

import { useState, type ReactNode } from 'react'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { useBoardStore } from '@/stores/board.store'

type DeleteAgentDialogProps = {
    agentId: string
    agentName?: string
    children?: ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function DeleteAgentDialog({ agentId, agentName, children, open: controlledOpen, onOpenChange }: DeleteAgentDialogProps) {
    const removeAgent = useBoardStore(s => s.removeAgent)
    const selectAgent = useBoardStore(s => s.selectAgent)
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const open = controlledOpen ?? uncontrolledOpen

    const canDelete = !agentName || confirmText.trim() === agentName

    const handleOpenChange = (next: boolean) => {
        if (controlledOpen === undefined) setUncontrolledOpen(next)
        onOpenChange?.(next)
        if (!next) setConfirmText('')
    }

    const handleDelete = () => {
        removeAgent(agentId)
        selectAgent(null)
        handleOpenChange(false)
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this coworker?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the coworker and its data on the engine. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {agentName && (
                    <div className="grid gap-2">
                        <p className="text-sm text-muted-foreground">
                            Type <span className="font-medium text-foreground">{agentName}</span> to confirm.
                        </p>
                        <Input
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && canDelete) handleDelete()
                            }}
                            placeholder={agentName}
                            autoFocus
                        />
                    </div>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} variant="destructive" disabled={!canDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
