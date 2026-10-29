'use client'

import {
    inviteToWorkspaceAction,
    listWorkspaceMembersAction,
    removeMemberAction,
    revokeInvitationAction,
    type WorkspaceInviteRow,
    type WorkspaceMember,
} from '@/app/api/_actions/members.actions'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { CopyLine } from '@/components/dialogs/CopyLine'
import { Loader2Icon, XIcon } from '@/lib/icons'
import { SkeletonList } from '@/components/ui/skeleton'
import { useSession } from '@/supabase/session/SessionProvider'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function initial(value: string): string {
    return value.trim().charAt(0).toUpperCase() || '?'
}

export function WorkspaceMembersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [members, setMembers] = useState<WorkspaceMember[]>([])
    const [inviteLink, setInviteLink] = useState<{ email: string; url: string } | null>(null)
    const [invites, setInvites] = useState<WorkspaceInviteRow[]>([])
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [draft, setDraft] = useState('')
    const [inviting, setInviting] = useState(false)
    const [removing, setRemoving] = useState(false)
    const { workspace } = useSession()

    // Neither a trial nor a paid plan has a seat limit, held as null. A cap was set by hand (admin),
    // so there is nothing to buy to lift it.
    const seatsFull = !loading && workspace?.max_seats != null && members.length + invites.length >= workspace.max_seats
    const seatsFullReason = seatsFull ? `Your workspace is capped at ${workspace.max_seats === 1 ? 'one seat' : `${workspace.max_seats} seats`}.` : undefined

    const refresh = useCallback(async () => {
        const result = await listWorkspaceMembersAction()
        if (!result.ok) {
            toast.error(result.error)
            setLoading(false)
            return
        }
        setMembers(result.members)
        setInvites(result.invites)
        setCurrentUserId(result.currentUserId)
        setLoading(false)
    }, [])

    useEffect(() => {
        if (!open) return
        refresh()
    }, [open, refresh])

    const invite = async () => {
        const email = draft.trim().toLowerCase()
        if (!EMAIL_RE.test(email) || inviting) return
        setInviting(true)
        const result = await inviteToWorkspaceAction(email)
        setInviting(false)
        if (!result.ok) {
            toast.error(result.error)
            return
        }
        if (result.inviteUrl) setInviteLink({ email, url: result.inviteUrl })
        else toast.success(`Invitation sent to ${email}`)
        setDraft('')
        refresh()
    }

    const revoke = async (id: string) => {
        const result = await revokeInvitationAction(id)
        if (!result.ok) return toast.error(result.error)
        refresh()
    }

    const removeMember = async (member: WorkspaceMember) => {
        if (removing) return
        setRemoving(true)
        const result = await removeMemberAction(member.userId)
        setRemoving(false)
        if (!result.ok) return toast.error(result.error)
        toast.success(`${member.email ?? 'Member'} removed from the workspace`)
        refresh()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Members</DialogTitle>
                    <p className="text-sm text-muted-foreground">Invite teammates to collaborate in this workspace.</p>
                </DialogHeader>

                {loading ? (
                    <SkeletonList rows={4} />
                ) : (
                    <div className="-mx-1 max-h-96 space-y-1 overflow-y-auto px-1">
                        {members.map(member => (
                            <Row key={member.userId} label={member.email ?? 'Unknown user'}>
                                {member.userId !== currentUserId && (
                                    <RemoveButton
                                        label="Remove member"
                                        confirmLabel="Remove"
                                        title={`Remove ${member.email ?? 'this member'}?`}
                                        description="They lose access to this workspace and everything in it right away. You can invite them back later."
                                        disabled={removing}
                                        onClick={() => removeMember(member)}
                                    />
                                )}
                            </Row>
                        ))}
                        {invites.map(inv => (
                            <Row key={inv.id} label={inv.email} badge="Pending" muted>
                                <RemoveButton
                                    label="Revoke invitation"
                                    confirmLabel="Revoke"
                                    title={`Revoke the invitation to ${inv.email}?`}
                                    description="Their invitation link stops working. You can send a new one at any time."
                                    onClick={() => revoke(inv.id)}
                                />
                            </Row>
                        ))}
                    </div>
                )}

                <div className="space-y-2 border-t pt-4">
                    {inviteLink && (
                        <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground">Send this link to {inviteLink.email}. It works for them only, once.</p>
                            <CopyLine value={inviteLink.url} label="Copy the invitation link" />
                        </div>
                    )}
                    <Input
                        label="Invite by email"
                        type="email"
                        placeholder="teammate@rerun.build"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                invite()
                            }
                        }}
                    />
                    <div className="flex justify-end gap-2">
                        <TooltipDisabledReason reason={seatsFullReason}>
                            <Button onClick={invite} disabled={seatsFull || !EMAIL_RE.test(draft.trim().toLowerCase()) || inviting}>
                                {inviting && <Loader2Icon className="animate-spin" />}
                                Invite
                            </Button>
                        </TooltipDisabledReason>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function Row({ label, badge, muted, children }: { label: string; badge?: string; muted?: boolean; children?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium', muted ? 'bg-foreground/5 text-muted-foreground' : 'bg-foreground/10 text-foreground')}>{initial(label)}</span>
            <span className={cn('min-w-0 flex-1 truncate text-sm', muted && 'text-muted-foreground')}>{label}</span>
            {badge && <span className="text-[11px] text-muted-foreground">{badge}</span>}
            {children}
        </div>
    )
}

function RemoveButton({ label, title, description, confirmLabel, disabled, onClick }: { label: string; title: string; description: string; confirmLabel: string; disabled?: boolean; onClick: () => void }) {
    return (
        <ConfirmDialog title={title} description={description} confirmLabel={confirmLabel} onConfirm={onClick}>
            <Button type="button" variant="ghost" size="icon-xs" disabled={disabled} title={label} aria-label={label} className="text-muted-foreground transition-colors hover:text-foreground">
                <XIcon className="size-4" />
            </Button>
        </ConfirmDialog>
    )
}
