'use client'

import { useEffect, useState } from 'react'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'

type DeleteSpaceDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    spaceName?: string
    agentCount: number
}

export function DeleteSpaceDialog({ open, onOpenChange, onConfirm, spaceName, agentCount }: DeleteSpaceDialogProps) {
    const [confirmText, setConfirmText] = useState('')

    useEffect(() => {
        if (!open) setConfirmText('')
    }, [open])

    const holdsAgents = agentCount > 0
    const canDelete = !holdsAgents && (!spaceName || confirmText.trim() === spaceName)
    const pronoun = agentCount === 1 ? 'it' : 'them'

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Box?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {holdsAgents
                            ? `This Box still holds ${agentCount} coworker${agentCount === 1 ? '' : 's'}. Move ${pronoun} to another Box or delete ${pronoun} first.`
                            : 'This action cannot be undone. The Box will be permanently removed.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {spaceName && !holdsAgents && (
                    <div className="grid gap-2">
                        <p className="text-sm text-muted-foreground">
                            Type <span className="font-medium text-foreground">{spaceName}</span> to confirm.
                        </p>
                        <Input
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && canDelete) onConfirm()
                            }}
                            placeholder={spaceName}
                            autoFocus
                        />
                    </div>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={!canDelete}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
