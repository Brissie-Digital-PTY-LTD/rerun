'use client'

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

type CloseRunningTabDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}

export function CloseRunningTabDialog({ open, onOpenChange, onConfirm }: CloseRunningTabDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>Close this conversation?</AlertDialogTitle>
                    <AlertDialogDescription>
                        The agent is still working on this conversation. Closing the tab won&apos;t stop the run — it will keep running in the background.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>
                        Close
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
