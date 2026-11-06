'use client'

import type { AccessLevel, SpaceVisibility } from '@/app/api/_auth/access'
import type { SpaceAccessMember, SpaceAccessPerson } from '@/app/api/_actions/space-access.actions'
import { ADMINS_ALWAYS, asIs, personLabel, removalOutcome } from '@/components/dialogs/access-person'
import { ACCESS_OPTIONS, OPTION_LIST_CLASS, OptionWithDescription } from '@/components/dialogs/AccessLevelOption'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { PanelRow } from '@/components/ui/panel-row'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import type { AuthorProfile } from '@/lib/chat/message-author'
import { XIcon } from '@/lib/icons'
import { Badge } from '@rerun/ui/primitives'
import { CardAvatar } from '@rerun/ui/chat'

type BoxAccessPersonRowProps = {
    person: SpaceAccessPerson
    member: SpaceAccessMember | undefined
    profile: AuthorProfile | null
    visibility: SpaceVisibility
    busy: boolean
    onAccessChange: (access: AccessLevel) => void
    onRemove: () => void
}

export function BoxAccessPersonRow({ person, member, profile, visibility, busy, onAccessChange, onRemove }: BoxAccessPersonRowProps) {
    const { title, email, named } = personLabel(profile, member?.email ?? null)
    const isAdmin = member?.role === 'admin'

    return (
        <PanelRow
            leading={<CardAvatar src={profile?.photo} fileUrl={asIs} name={title} className="size-8" />}
            title={title}
            meta={
                isAdmin ? (
                    <Badge size="xs" tone="brand" glow={false}>
                        Admin
                    </Badge>
                ) : undefined
            }
            description={named ? email : undefined}
            footer={person.createdBox ? 'Created this Box' : undefined}
            actions={
                <>
                    <TooltipDisabledReason reason={isAdmin ? ADMINS_ALWAYS : undefined}>
                        <Select value={person.access} onValueChange={value => onAccessChange(value as AccessLevel)} disabled={busy || isAdmin}>
                            <SelectTrigger size="sm" className="w-32 shrink-0" aria-label={`Access of ${title}`}>
                                <SelectValue>{ACCESS_OPTIONS[person.access].label}</SelectValue>
                            </SelectTrigger>
                            <SelectContent position="popper" align="end" className={OPTION_LIST_CLASS}>
                                <SelectItem value="use">
                                    <OptionWithDescription {...ACCESS_OPTIONS.use} />
                                </SelectItem>
                                <SelectItem value="manage">
                                    <OptionWithDescription {...ACCESS_OPTIONS.manage} />
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </TooltipDisabledReason>
                    <ConfirmDialog
                        title={`Remove ${title}?`}
                        description={removalOutcome(visibility, person.access, isAdmin)}
                        confirmLabel="Remove"
                        onConfirm={onRemove}
                    >
                        <Button type="button" variant="ghost" size="icon-xs" disabled={busy} aria-label={`Remove ${title}`} className="text-muted-foreground">
                            <XIcon className="size-4" />
                        </Button>
                    </ConfirmDialog>
                </>
            }
        />
    )
}
