import { accountLabel } from '@/lib/auth/placeholder-email'
import { acceptInvitationAction, loadInvitationAction } from '@/app/api/_actions/members.actions'
import { Card } from '@/components/ui/card'
import { routes } from '@/lib/routes'
import { WORKSPACE_PARAM } from '@/lib/workspace/workspace-header'
import { getServerSession } from '@/supabase/session/getServerSession'
import { redirect } from 'next/navigation'
import { InviteMismatch } from './InviteMismatch'
import { InviteRedirect } from './InviteRedirect'

function Shell({ title, message }: { title: string; message: string }) {
    return (
        <Card className="space-y-2 p-8">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
        </Card>
    )
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params

    const invite = await loadInvitationAction(token)
    if (invite.status === 'not_found') return <Shell title="Invitation not found" message="This invitation link is invalid." />
    if (invite.status === 'unavailable') return <Shell title="Invitation unavailable" message="This invitation has already been used or was revoked." />
    if (invite.status === 'expired') return <Shell title="Invitation expired" message="This invitation has expired. Ask the workspace owner to send a new one." />

    const { session } = await getServerSession()

    if (!session?.email) return <InviteRedirect token={token} email={invite.email} workspaceName={invite.workspaceName} />
    if (session.email.toLowerCase() !== invite.email.toLowerCase()) return <InviteMismatch inviteEmail={invite.email} currentEmail={accountLabel(session.email) ?? session.email} workspaceName={invite.workspaceName} />

    const result = await acceptInvitationAction(token)
    if (!result.ok) return <Shell title="Could not join workspace" message={result.error} />

    // Named in the URL so a tab already pinned on another workspace lands on the joined one.
    redirect(`${routes.home}?${WORKSPACE_PARAM}=${result.workspaceId}`)
}
