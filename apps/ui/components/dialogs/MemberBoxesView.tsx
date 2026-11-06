'use client'

import type { WorkspaceMember } from '@/app/api/_actions/members.actions'
import type { MemberAccessView, MemberBoxAccess } from '@/app/api/_actions/space-access.actions'
import type { BoxAccess } from '@/app/api/_auth/access'
import type { BoxScope } from '@/app/api/_auth/box-scope'
import { AccessDrillHeader } from '@/components/dialogs/AccessDrillHeader'
import { ACCESS_OPTIONS, OPTION_LIST_CLASS, OptionWithDescription } from '@/components/dialogs/AccessLevelOption'
import { asIs, BOX_ACCESS_ADMIN_ONLY, levelOutcome, personLabel, scopeOutcome } from '@/components/dialogs/access-person'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Group } from '@/components/connections/AiProvidersPanel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { PanelScroller } from '@/components/ui/panel-list'
import { PanelRow } from '@/components/ui/panel-row'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton, SkeletonPanelRows } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import { UNNAMED_BOX_LABEL } from '@/lib/board/types'
import type { AuthorProfile } from '@/lib/chat/message-author'
import { ShieldCheckIcon } from '@/lib/icons'
import { CardAvatar } from '@rerun/ui/chat'
import { useState } from 'react'

const EVERYONE = 'everyone'
const LEVEL_OPTIONS: Record<BoxAccess | typeof EVERYONE, { label: string; description: string }> = { everyone: { label: 'Everyone', description: 'Can use it, the Box is open to the workspace' }, ...ACCESS_OPTIONS }

export type MemberBoxesViewProps = {
    member: WorkspaceMember
    profile: AuthorProfile | null
    // Null while it loads.
    access: MemberAccessView | null
    viewerIsAdmin: boolean
    busy: boolean
    onBack: () => void
    onScopeChange: (scope: BoxScope) => void
    onLevelChange: (box: MemberBoxAccess, level: BoxAccess) => void
    onRestrict: (box: MemberBoxAccess) => void
}

// Every Box seen from one person: the same rows as the Box access dialog, from the other side.
export function MemberBoxesView({ member, profile, access, viewerIsAdmin, busy, onBack, onScopeChange, onLevelChange, onRestrict }: MemberBoxesViewProps) {
    const { title } = personLabel(profile, member.email)
    const readOnlyReason = viewerIsAdmin ? undefined : BOX_ACCESS_ADMIN_ONLY
    const targetIsAdmin = (access?.role ?? member.role) === 'admin'
    // Opening every Box is free; closing them asks first.
    const [confirmingAssigned, setConfirmingAssigned] = useState(false)

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <AccessDrillHeader
                leading={<CardAvatar src={profile?.photo} fileUrl={asIs} name={title} className="size-8" />}
                title={`Boxes of ${title}`}
                hint={member.email ?? undefined}
                backLabel="Back to members"
                onBack={onBack}
            />
            {!access ? (
                <MemberBoxesSkeleton />
            ) : targetIsAdmin ? (
                <PanelScroller className="p-4">
                    <Alert>
                        <ShieldCheckIcon />
                        <AlertDescription>Admins have access to every Box</AlertDescription>
                    </Alert>
                </PanelScroller>
            ) : (
                <PanelScroller className="space-y-6 p-4">
                    <Field orientation="row" label="Boxes shared with the workspace" helperText={access.boxScope === 'all' ? 'Uses every Box open to everyone' : 'Uses only the Boxes named below'}>
                        <TooltipDisabledReason reason={readOnlyReason}>
                            <Switch checked={access.boxScope === 'all'} disabled={!!readOnlyReason || busy} onCheckedChange={checked => (checked ? onScopeChange('all') : setConfirmingAssigned(true))} aria-label="Boxes shared with the workspace" />
                        </TooltipDisabledReason>
                    </Field>
                    <ConfirmDialog
                        open={confirmingAssigned}
                        onOpenChange={setConfirmingAssigned}
                        title={`Limit ${title} to named Boxes?`}
                        description={scopeOutcome()}
                        confirmLabel="Limit"
                        confirmVariant="default"
                        onConfirm={() => onScopeChange('assigned')}
                    />

                    <Group title="Boxes">
                        {access.boxes.length === 0 ? (
                            <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">No Box yet</p>
                        ) : (
                            access.boxes.map(box => (
                                <MemberBoxRow key={box.spaceId} box={box} boxScope={access.boxScope} personName={title} readOnlyReason={readOnlyReason} busy={busy} onLevelChange={level => onLevelChange(box, level)} onRestrict={() => onRestrict(box)} />
                            ))
                        )}
                    </Group>
                </PanelScroller>
            )}
        </div>
    )
}

type MemberBoxRowProps = {
    box: MemberBoxAccess
    boxScope: BoxScope
    personName: string
    readOnlyReason: string | undefined
    busy: boolean
    onLevelChange: (level: BoxAccess) => void
    onRestrict: () => void
}

function MemberBoxRow({ box, boxScope, personName, readOnlyReason, busy, onLevelChange, onRestrict }: MemberBoxRowProps) {
    const [confirmingRestrict, setConfirmingRestrict] = useState(false)
    const [confirmingNone, setConfirmingNone] = useState(false)
    const name = box.name || UNNAMED_BOX_LABEL
    const noneOutcome = levelOutcome(box, boxScope)
    const fromEveryone = box.source === 'workspace'
    const value = fromEveryone ? EVERYONE : box.access
    const coworkers = box.agentCount === 1 ? '1 coworker' : `${box.agentCount} coworkers`

    return (
        <PanelRow
            title={name}
            description={box.visibility === 'restricted' ? `${coworkers} · Only selected people` : coworkers}
            actions={
                <TooltipDisabledReason reason={readOnlyReason}>
                    <Select value={value} onValueChange={next => (next === 'none' && noneOutcome ? setConfirmingNone(true) : onLevelChange(next as BoxAccess))} disabled={!!readOnlyReason || busy}>
                        <SelectTrigger size="sm" className="w-32 shrink-0" aria-label={`Access to ${name}`}>
                            <SelectValue>{LEVEL_OPTIONS[value].label}</SelectValue>
                        </SelectTrigger>
                        <SelectContent position="popper" align="end" className={OPTION_LIST_CLASS}>
                            {fromEveryone ? (
                                <SelectItem value={EVERYONE} disabled>
                                    <OptionWithDescription {...LEVEL_OPTIONS.everyone} />
                                </SelectItem>
                            ) : (
                                <SelectItem value="none">
                                    <OptionWithDescription {...LEVEL_OPTIONS.none} />
                                </SelectItem>
                            )}
                            <SelectItem value="use">
                                <OptionWithDescription {...LEVEL_OPTIONS.use} />
                            </SelectItem>
                            <SelectItem value="manage">
                                <OptionWithDescription {...LEVEL_OPTIONS.manage} />
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </TooltipDisabledReason>
            }
        >
            {box.visibility === 'workspace' && (
                <TooltipDisabledReason reason={readOnlyReason} className="self-start">
                    <Button variant="link" size="xs" className="h-auto self-start p-0 text-xs" disabled={!!readOnlyReason || busy} onClick={() => setConfirmingRestrict(true)}>
                        Restrict this Box
                    </Button>
                </TooltipDisabledReason>
            )}
            <ConfirmDialog
                open={confirmingRestrict}
                onOpenChange={setConfirmingRestrict}
                title={`Restrict ${name}?`}
                description={`Only ${personName}, the people already named on it and admins keep access.`}
                confirmLabel="Restrict"
                confirmVariant="default"
                onConfirm={onRestrict}
            />
            {noneOutcome && (
                <ConfirmDialog
                    open={confirmingNone}
                    onOpenChange={setConfirmingNone}
                    title={`Remove access to ${name}?`}
                    description={noneOutcome}
                    confirmLabel="Remove"
                    onConfirm={() => onLevelChange('none')}
                />
            )}
        </PanelRow>
    )
}

function MemberBoxesSkeleton() {
    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <SkeletonPanelRows rows={4} className="space-y-1.5 p-0" />
            </div>
        </div>
    )
}
