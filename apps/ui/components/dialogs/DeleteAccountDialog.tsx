'use client'

import { useEffect, useState } from 'react'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { DELETE_ACCOUNT_CONFIRMATION } from '@/lib/auth/account-deletion'
import { Loader2Icon } from '@/lib/icons'

export function DeleteAccountDialog({ open, pending, onOpenChange, onConfirm }: { open: boolean; pending: boolean; onOpenChange: (open: boolean) => void; onConfirm: (confirmation: string) => void }) {
    const [confirmText, setConfirmText] = useState('')

    useEffect(() => {
        if (!open) setConfirmText('')
    }, [open])

    const canDelete = !pending && confirmText.trim() === DELETE_ACCOUNT_CONFIRMATION

    return (
        <AlertDialog open={open} onOpenChange={next => !pending && onOpenChange(next)}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>You will be signed out and will not be able to sign back into this account. Workspaces only you are in stop for good. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">
                        Type <span className="font-medium text-foreground">{DELETE_ACCOUNT_CONFIRMATION}</span> to confirm.
                    </p>
                    <Input
                        value={confirmText}
                        onChange={event => setConfirmText(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Enter' && canDelete) onConfirm(confirmText)
                        }}
                        placeholder={DELETE_ACCOUNT_CONFIRMATION}
                        autoComplete="off"
                        disabled={pending}
                        autoFocus
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        disabled={!canDelete}
                        onClick={event => {
                            event.preventDefault()
                            onConfirm(confirmText)
                        }}
                    >
                        {pending && <Loader2Icon className="animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
