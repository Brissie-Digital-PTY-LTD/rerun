'use client'

import type { WorkspaceInviteRow, WorkspaceMember } from '@/app/api/_actions/members.actions'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PanelRow } from '@/components/ui/panel-row'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import { UNNAMED } from '@/hooks/useMemberProfiles'
import { ChevronRightIcon, EllipsisIcon, XIcon } from '@/lib/icons'
import type { AuthorProfile } from '@/lib/chat/message-author'
import type { WorkspaceRole } from '@/supabase/session/SessionProvider'
import { Badge } from '@rerun/ui/primitives'
import { CardAvatar } from '@rerun/ui/chat'
import { useState } from 'react'

export const MEMBERS_ADMIN_ONLY = 'Only an admin can manage members'
const LAST_ADMIN = 'The workspace needs at least one admin'

const asIs = (path: string) => path

type MemberRowProps = {
    member: WorkspaceMember
    profile: AuthorProfile | null
    isSelf: boolean
    viewerIsAdmin: boolean
    isLastAdmin: boolean
    busy: boolean
    onRoleChange: (role: WorkspaceRole) => void
    onRemove: () => void
    // Opens the Boxes of this person. Absent where the viewer may not read them.
    onOpen?: () => void
}

export function WorkspaceMemberRow({ member, profile, isSelf, viewerIsAdmin, isLastAdmin, busy, onRoleChange, onRemove, onOpen }: MemberRowProps) {
    const [confirmingRemoval, setConfirmingRemoval] = useState(false)
    const email = member.email ?? 'Unknown user'
    const name = profile?.name && profile.name !== UNNAMED ? profile.name : null
    const nextRole: WorkspaceRole = member.role === 'admin' ? 'member' : 'admin'
    const roleChangeBlocked = nextRole === 'member' && isLastAdmin ? LAST_ADMIN : undefined

    return (
        <>
            <PanelRow
                onClick={onOpen}
                leading={<CardAvatar src={profile?.photo} fileUrl={asIs} name={name ?? email} className="size-8" />}
                title={
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate">{name ?? email}</span>
                        {isSelf && <span className="shrink-0 text-xs font-normal text-muted-foreground">You</span>}
                    </span>
                }
                description={name ? email : undefined}
                actions={
                    <>
                        {member.role === 'admin' && (
                            <Badge size="xs" tone="brand" glow={false} className="mr-1">
                                Admin
                            </Badge>
                        )}
                        {/* The menu is portaled, and React still bubbles its clicks to the row. */}
                        <div className="flex" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
                            <DropdownMenu>
                                <TooltipDisabledReason reason={viewerIsAdmin ? undefined : MEMBERS_ADMIN_ONLY}>
                                    <DropdownMenuTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon-xs" disabled={!viewerIsAdmin || busy} aria-label={`Manage ${email}`} className="text-muted-foreground">
                                            <EllipsisIcon className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipDisabledReason>
                                <DropdownMenuContent align="end" className="min-w-40">
                                    <TooltipDisabledReason reason={roleChangeBlocked} side="bottom" className="flex w-full">
                                        <DropdownMenuItem disabled={!!roleChangeBlocked} onSelect={() => onRoleChange(nextRole)} className="w-full">
                                            {nextRole === 'admin' ? 'Make admin' : 'Make member'}
                                        </DropdownMenuItem>
                                    </TooltipDisabledReason>
                                    {!isSelf && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmingRemoval(true)}>
                                                Remove
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {onOpen && <ChevronRightIcon className="size-4 text-muted-foreground" />}
                    </>
                }
            />
            <ConfirmDialog
                open={confirmingRemoval}
                onOpenChange={setConfirmingRemoval}
                title={`Remove ${email}?`}
                description="They lose access to this workspace and everything in it right away. You can invite them back later."
                confirmLabel="Remove"
                onConfirm={onRemove}
            />
        </>
    )
}

export function WorkspaceInviteRowView({ invite, viewerIsAdmin, onRevoke }: { invite: WorkspaceInviteRow; viewerIsAdmin: boolean; onRevoke: () => void }) {
    return (
        <PanelRow
            className="border-dashed bg-transparent"
            leading={<CardAvatar name={invite.email} className="size-8 opacity-60" />}
            title={<span className="text-muted-foreground">{invite.email}</span>}
            description={invite.boxScope === 'assigned' ? 'assign later' : undefined}
            meta={
                <Badge size="xs" tone="neutral" glow={false}>
                    Pending
                </Badge>
            }
            actions={
                viewerIsAdmin ? (
                    <ConfirmDialog title={`Revoke the invitation to ${invite.email}?`} description="Their invitation link stops working. You can send a new one at any time." confirmLabel="Revoke" onConfirm={onRevoke}>
                        <RevokeButton />
                    </ConfirmDialog>
                ) : (
                    <TooltipDisabledReason reason={MEMBERS_ADMIN_ONLY}>
                        <RevokeButton disabled />
                    </TooltipDisabledReason>
                )
            }
        />
    )
}

function RevokeButton({ disabled }: { disabled?: boolean }) {
    return (
        <Button type="button" variant="ghost" size="icon-xs" disabled={disabled} aria-label="Revoke invitation" className="text-muted-foreground">
            <XIcon className="size-4" />
        </Button>
    )
}
