'use client'

import { NewBoxForm, type NewBoxIntro } from '@/components/dialogs/new-box/NewBoxForm'
import { SplitDialogContent } from '@/components/dialogs/SplitDialogContent'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useBoxViewer } from '@/hooks/useBoxAccess'
import type { SpaceSide } from '@/lib/board/space-layout'
import { useBoxNameSuggestions } from '@/lib/onboarding/useBoxNameSuggestions'
import { useBoardStore } from '@/stores/board.store'
import { useSession } from '@/supabase/session/SessionProvider'

// `target` porte la face de la Box d'où part la création : c'est le board qui l'ouvre, en cliquant
// un « + » posé sur une face. Fermée quand il vaut null, sauf si `open` la demande sans face : la
// Box s'empile alors sous les autres.
export type ClaimSpaceTarget = { spaceId: string; side: SpaceSide }

export const BOX_FIRST_INTRO: NewBoxIntro = { heading: 'Create a Box first', description: 'Your new coworker lands in it, and you manage it.' }

// One column rather than the house form and aside, like New agent: the Box being named is the
// illustration, and it leads. The frame keeps the house size.
//
// `onCreated`, when given, is called instead of `onClose` once the Box exists: a flow that asked
// for the Box goes on, while `onClose` alone means it was dismissed.
export function ClaimSpaceDialog({ target, open = !!target, onClose, onCreated, intro }: { target: ClaimSpaceTarget | null; open?: boolean; onClose: () => void; onCreated?: () => void; intro?: NewBoxIntro }) {
    const { workspace } = useSession()
    const claimSpace = useBoardStore(s => s.claimSpace)
    const viewer = useBoxViewer()
    const suggestions = useBoxNameSuggestions()

    async function create(name: string) {
        if (!workspace) return
        await claimSpace(workspace.id, name, target ?? undefined, viewer)
        if (onCreated) onCreated()
        else onClose()
    }

    return (
        <Dialog open={open} onOpenChange={next => !next && onClose()}>
            <SplitDialogContent aside={null} gridClassName="sm:grid-cols-1">
                <DialogTitle className="sr-only">New Box</DialogTitle>
                <DialogDescription className="sr-only">Name the Box, or pick a suggested name.</DialogDescription>
                <NewBoxForm suggestions={suggestions} onCreate={create} intro={intro} />
            </SplitDialogContent>
        </Dialog>
    )
}
