'use client'

import { NewBoxForm } from '@/components/dialogs/new-box/NewBoxForm'
import { SplitDialogContent } from '@/components/dialogs/SplitDialogContent'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { SpaceSide } from '@/lib/board/space-layout'
import { useBoxNameSuggestions } from '@/lib/onboarding/useBoxNameSuggestions'
import { useBoardStore } from '@/stores/board.store'
import { useSession } from '@/supabase/session/SessionProvider'

// `target` porte la face de la Box d'où part la création : c'est le board qui l'ouvre, en cliquant
// un « + » posé sur une face. Fermée quand il vaut null, sauf si `open` la demande sans face : la
// Box s'empile alors sous les autres.
export type ClaimSpaceTarget = { spaceId: string; side: SpaceSide }

// One column rather than the house form and aside, like New agent: the Box being named is the
// illustration, and it leads. The frame keeps the house size.
export function ClaimSpaceDialog({ target, open = !!target, onClose }: { target: ClaimSpaceTarget | null; open?: boolean; onClose: () => void }) {
    const { workspace } = useSession()
    const claimSpace = useBoardStore(s => s.claimSpace)
    const suggestions = useBoxNameSuggestions()

    async function create(name: string) {
        if (!workspace) return
        await claimSpace(workspace.id, name, target ?? undefined)
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={next => !next && onClose()}>
            <SplitDialogContent aside={null} gridClassName="sm:grid-cols-1">
                <DialogTitle className="sr-only">New Box</DialogTitle>
                <DialogDescription className="sr-only">Name the Box, or pick a suggested name.</DialogDescription>
                <NewBoxForm suggestions={suggestions} onCreate={create} />
            </SplitDialogContent>
        </Dialog>
    )
}
