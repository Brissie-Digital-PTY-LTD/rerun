'use client'

import type { WorkspaceInviteRow, WorkspaceMember } from '@/app/api/_actions/members.actions'
import type { MemberAccessView, MemberBoxAccess } from '@/app/api/_actions/space-access.actions'
import type { BoxAccess } from '@/app/api/_auth/access'
import type { BoxScope } from '@/app/api/_auth/box-scope'
import { OPTION_LIST_CLASS, OptionWithDescription } from '@/components/dialogs/AccessLevelOption'
import { CopyLine } from '@/components/dialogs/CopyLine'
import { MemberBoxesView } from '@/components/dialogs/MemberBoxesView'
import { MEMBERS_ADMIN_ONLY, WorkspaceInviteRowView, WorkspaceMemberRow } from '@/components/dialogs/WorkspaceMemberRow'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PanelScroller } from '@/components/ui/panel-list'
import { PanelSteps } from '@/components/ui/panel-steps'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SkeletonList } from '@/components/ui/skeleton'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import type { AuthorProfile } from '@/lib/chat/message-author'
import { Loader2Icon } from '@/lib/icons'
import type { WorkspaceRole } from '@/supabase/session/SessionProvider'
import { useState } from 'react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SCOPE_OPTIONS: Record<BoxScope, { label: string; description: string }> = {
    all: { label: 'All Boxes', description: 'Every Box open to the workspace' },
    assigned: { label: 'None, assign later', description: 'Only the Boxes you give them' },
}

// The person whose Boxes are open in the drill-in, and those Boxes once read.
export type OpenedMember = { member: WorkspaceMember; access: MemberAccessView | null }

export type WorkspaceMembersViewProps = {
    loading: boolean
    members: WorkspaceMember[]
    invites: WorkspaceInviteRow[]
    currentUserId: string | null
    currentRole: WorkspaceRole | null
    // Null when the workspace has no cap, the case of every trial and paid plan.
    maxSeats: number | null
    inviteLink: { email: string; url: string } | null
    busy: boolean
    profileOf: (userId: string) => AuthorProfile | null
    // Resolves true once the invitation is out, so the field can be cleared.
    onInvite: (email: string, boxScope: BoxScope) => Promise<boolean>
    onRoleChange: (member: WorkspaceMember, role: WorkspaceRole) => void
    onRemove: (member: WorkspaceMember) => void
    onRevoke: (invite: WorkspaceInviteRow) => void
    opened: OpenedMember | null
    onOpenMember: (member: WorkspaceMember) => void
    onCloseMember: () => void
    onScopeChange: (member: WorkspaceMember, scope: BoxScope) => void
    onBoxLevelChange: (member: WorkspaceMember, box: MemberBoxAccess, level: BoxAccess) => void
    onRestrictBox: (member: WorkspaceMember, box: MemberBoxAccess) => void
}

export function WorkspaceMembersView(props: WorkspaceMembersViewProps) {
    const { opened, currentRole, busy, profileOf, onCloseMember, onScopeChange, onBoxLevelChange, onRestrictBox } = props

    return (
        <>
            <DialogHeader className="border-b px-4 py-4">
                <DialogTitle>Members</DialogTitle>
                <DialogDescription>Admins manage billing, members and settings. Members use the coworkers.</DialogDescription>
            </DialogHeader>

            <PanelSteps stepKey={opened ? opened.member.userId : 'list'} depth={opened ? 1 : 0}>
                {opened ? (
                    <MemberBoxesView
                        member={opened.member}
                        profile={profileOf(opened.member.userId)}
                        access={opened.access}
                        viewerIsAdmin={currentRole === 'admin'}
                        busy={busy}
                        onBack={onCloseMember}
                        onScopeChange={scope => onScopeChange(opened.member, scope)}
                        onLevelChange={(box, level) => onBoxLevelChange(opened.member, box, level)}
                        onRestrict={box => onRestrictBox(opened.member, box)}
                    />
                ) : (
                    <MembersList {...props} />
                )}
            </PanelSteps>
        </>
    )
}

function MembersList({ loading, members, invites, currentUserId, currentRole, maxSeats, inviteLink, busy, profileOf, onInvite, onRoleChange, onRemove, onRevoke, onOpenMember }: WorkspaceMembersViewProps) {
    const [draft, setDraft] = useState('')
    const [boxScope, setBoxScope] = useState<BoxScope>('all')
    const [inviting, setInviting] = useState(false)

    const isAdmin = currentRole === 'admin'
    const adminCount = members.filter(m => m.role === 'admin').length
    const seatsFull = !loading && maxSeats != null && members.length + invites.length >= maxSeats
    const inviteDisabledReason = loading ? undefined : !isAdmin ? MEMBERS_ADMIN_ONLY : seatsFull ? `Your workspace is capped at ${maxSeats === 1 ? 'one seat' : `${maxSeats} seats`}.` : undefined
    const email = draft.trim().toLowerCase()

    const invite = async () => {
        if (!EMAIL_RE.test(email) || inviting || inviteDisabledReason) return
        setInviting(true)
        const sent = await onInvite(email, boxScope)
        setInviting(false)
        if (sent) setDraft('')
    }

    return (
        <>
            {loading ? (
                <div className="p-4">
                    <SkeletonList rows={4} />
                </div>
            ) : (
                <PanelScroller className="space-y-1.5 p-4">
                    {members.map(member => (
                        <WorkspaceMemberRow
                            key={member.userId}
                            member={member}
                            profile={profileOf(member.userId)}
                            isSelf={member.userId === currentUserId}
                            viewerIsAdmin={isAdmin}
                            isLastAdmin={member.role === 'admin' && adminCount <= 1}
                            busy={busy}
                            onRoleChange={role => onRoleChange(member, role)}
                            onRemove={() => onRemove(member)}
                            onOpen={isAdmin || member.userId === currentUserId ? () => onOpenMember(member) : undefined}
                        />
                    ))}
                    {invites.map(inv => (
                        <WorkspaceInviteRowView key={inv.id} invite={inv} viewerIsAdmin={isAdmin} onRevoke={() => onRevoke(inv)} />
                    ))}
                </PanelScroller>
            )}

            <div className="space-y-2 border-t p-4">
                {inviteLink && (
                    <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Send this link to {inviteLink.email}. It works for them only, once.</p>
                        <CopyLine value={inviteLink.url} label="Copy the invitation link" />
                    </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                        <Input
                            label="Invite by email"
                            type="email"
                            placeholder="teammate@rerun.build"
                            value={draft}
                            disabled={!loading && !isAdmin}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    invite()
                                }
                            }}
                        />
                    </div>
                    <Field label="Boxes" htmlFor="invite-box-scope" className="sm:w-44">
                        <Select value={boxScope} onValueChange={value => setBoxScope(value as BoxScope)} disabled={!loading && !isAdmin}>
                            <SelectTrigger id="invite-box-scope" className="w-full">
                                <SelectValue>{SCOPE_OPTIONS[boxScope].label}</SelectValue>
                            </SelectTrigger>
                            <SelectContent position="popper" align="end" className={OPTION_LIST_CLASS}>
                                <SelectItem value="all">
                                    <OptionWithDescription {...SCOPE_OPTIONS.all} />
                                </SelectItem>
                                <SelectItem value="assigned">
                                    <OptionWithDescription {...SCOPE_OPTIONS.assigned} />
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <TooltipDisabledReason reason={inviteDisabledReason} className="max-sm:w-full">
                        <Button className="max-sm:w-full" onClick={invite} disabled={!!inviteDisabledReason || loading || !EMAIL_RE.test(email) || inviting}>
                            {inviting && <Loader2Icon className="animate-spin" />}
                            Invite
                        </Button>
                    </TooltipDisabledReason>
                </div>
            </div>
        </>
    )
}
