'use client'

import { RotateCwIcon } from '@/lib/icons'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { restartWorkspaceEngineAction } from '@/app/api/_actions/space.actions'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export type PowerAction = 'restart'

const COPY: Record<PowerAction, { title: string; description: string; confirmLabel: string; pending: string; success: string }> = {
    restart: {
        title: 'Restart the machine?',
        description: 'Every coworker of this workspace will be unreachable for a few minutes.',
        confirmLabel: 'Restart',
        pending: 'Restarting the machine…',
        success: 'Restart started — the machine will be back in a few minutes.',
    },
}

// The menu half. It only arms the confirmation: an AlertDialog rendered inside DropdownMenuContent
// is unmounted with the menu, so it would never get to open. The caller gates it on useIsAdmin too:
// a section that renders nothing still gets a separator from the menu that lays it out.
export function WorkspacePowerMenuItems({ onPick }: { onPick: (action: PowerAction) => void }) {
    const isAdmin = useIsAdmin()
    if (!isAdmin) return null

    return (
        <DropdownMenuItem onSelect={() => onPick('restart')} className="gap-2 text-muted-foreground">
            <RotateCwIcon className="size-4" />
            Restart machine
        </DropdownMenuItem>
    )
}

export function WorkspacePowerDialog({ action, onOpenChange }: { action: PowerAction | null; onOpenChange: (open: boolean) => void }) {
    const isAdmin = useIsAdmin()
    const [isPending, startTransition] = useTransition()

    function run(next: PowerAction) {
        const copy = COPY[next]
        startTransition(async () => {
            const toastId = toast.loading(copy.pending)
            try {
                const result = await restartWorkspaceEngineAction()
                if (result.ok) toast.success(copy.success, { id: toastId })
                else toast.error(result.error, { id: toastId })
            } catch {
                toast.error('Something went wrong', { id: toastId })
            }
        })
        onOpenChange(false)
    }

    if (!isAdmin) return null

    return (
        <AlertDialog open={action !== null} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>{action && COPY[action].title}</AlertDialogTitle>
                    <AlertDialogDescription>{action && COPY[action].description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => {
                            if (action) run(action)
                        }}
                    >
                        {action && COPY[action].confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
