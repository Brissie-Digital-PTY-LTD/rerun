import { redirect } from 'next/navigation'

import { loadOwnCreatorInviteAction } from '@/app/api/_actions/creator-onboarding.actions'
import { getServerSession } from '@/supabase/session/getServerSession'
import { routes } from '@/lib/routes'
import { CreatorOnboarding } from './CreatorOnboarding'
import { JoinShell } from './JoinShell'

// The resume point of the flow, and the target of the conditions wall on the home. No token here:
// the account already carries the fiche, so anyone landing on it without one has nothing to resume.
export default async function CreatorJoinResumePage() {
    const { session } = await getServerSession()
    if (!session?.email) redirect(routes.auth)

    const result = await loadOwnCreatorInviteAction()
    if (result.status !== 'ok') return <JoinShell title="Nothing to claim" message="This account is not linked to a creator application." />
    if (result.invite.termsAccepted) redirect(routes.home)

    return <CreatorOnboarding invite={result.invite} />
}
