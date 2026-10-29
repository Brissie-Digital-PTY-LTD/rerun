'use client'

import type { ApiKeyView } from '@/app/api/_actions/api-keys.actions'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Loader2Icon } from '@/lib/icons'

export function RevokeApiKeyDialog({ apiKey, pending, onOpenChange, onConfirm }: { apiKey: ApiKeyView | null; pending: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
    return (
        <AlertDialog open={!!apiKey} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>Revoke this key?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {apiKey?.name ?? 'This key'} stops working right away, and whatever runs on it loses its hold on the workspace. The key cannot be brought back, but you can create
                        another one.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                    {/* preventDefault keeps the confirm open with a spinner; the parent closes it once the
                        action lands, which also avoids body pointer-events sticking on unmount. */}
                    <AlertDialogAction
                        variant="destructive"
                        disabled={pending}
                        onClick={event => {
                            event.preventDefault()
                            onConfirm()
                        }}
                    >
                        {pending && <Loader2Icon className="animate-spin" />}
                        Revoke
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
