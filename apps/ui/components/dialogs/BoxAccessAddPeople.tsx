'use client'

import type { AccessLevel } from '@/app/api/_auth/access'
import type { SpaceAccessMember } from '@/app/api/_actions/space-access.actions'
import { AccessDrillHeader } from '@/components/dialogs/AccessDrillHeader'
import { ADMINS_ALWAYS, asIs, personLabel } from '@/components/dialogs/access-person'
import { ACCESS_OPTIONS, OptionWithDescription } from '@/components/dialogs/AccessLevelOption'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Field } from '@/components/ui/field'
import { PanelScroller } from '@/components/ui/panel-list'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AuthorProfile } from '@/lib/chat/message-author'
import { Loader2Icon } from '@/lib/icons'
import { CardAvatar } from '@rerun/ui/chat'
import { useMemo, useState } from 'react'

type BoxAccessAddPeopleProps = {
    boxName: string
    members: SpaceAccessMember[]
    // Already named on the Box: they are changed from their row, not added twice.
    listedUserIds: Set<string>
    profileOf: (userId: string) => AuthorProfile | null
    onBack: () => void
    // Resolves true once the rows are written, so the page can close.
    onAdd: (userIds: string[], access: AccessLevel) => Promise<boolean>
}

export function BoxAccessAddPeople({ boxName, members, listedUserIds, profileOf, onBack, onAdd }: BoxAccessAddPeopleProps) {
    const [picked, setPicked] = useState<string[]>([])
    const [access, setAccess] = useState<AccessLevel>('use')
    const [adding, setAdding] = useState(false)

    const options = useMemo(
        () =>
            members
                .filter(member => !listedUserIds.has(member.userId))
                .map((member): ComboboxOption => {
                    const profile = profileOf(member.userId)
                    const { title, email } = personLabel(profile, member.email)
                    const isAdmin = member.role === 'admin'
                    return {
                        value: member.userId,
                        label: title,
                        keywords: [title, email ?? ''],
                        leading: <CardAvatar src={profile?.photo} fileUrl={asIs} name={title} className="size-5" />,
                        disabled: isAdmin,
                        hint: isAdmin ? ADMINS_ALWAYS : undefined,
                    }
                })
                .sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled)),
        [members, listedUserIds, profileOf],
    )

    const add = async () => {
        if (picked.length === 0 || adding) return
        setAdding(true)
        const added = await onAdd(picked, access)
        setAdding(false)
        if (added) onBack()
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <AccessDrillHeader title="Add people" hint={boxName} backLabel="Back to access" onBack={onBack} />
            <PanelScroller className="space-y-4 p-4">
                <Field label="People">
                    <Combobox multiple groups={[{ id: 'members', options }]} value={picked} onChange={setPicked} placeholder="Pick teammates" searchPlaceholder="Search by name or email" emptyText="Nobody left to add" />
                </Field>
                <Field label="Access" htmlFor="box-access-level">
                    <Select value={access} onValueChange={value => setAccess(value as AccessLevel)}>
                        <SelectTrigger id="box-access-level" className="w-full">
                            <SelectValue>{ACCESS_OPTIONS[access].label}</SelectValue>
                        </SelectTrigger>
                        <SelectContent position="popper">
                            <SelectItem value="use">
                                <OptionWithDescription {...ACCESS_OPTIONS.use} />
                            </SelectItem>
                            <SelectItem value="manage">
                                <OptionWithDescription {...ACCESS_OPTIONS.manage} />
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={onBack} className="max-sm:flex-1">
                        Cancel
                    </Button>
                    <Button onClick={add} disabled={picked.length === 0 || adding} className="max-sm:flex-1">
                        {adding && <Loader2Icon className="animate-spin" />}
                        {picked.length > 1 ? `Add ${picked.length} people` : 'Add'}
                    </Button>
                </div>
            </PanelScroller>
        </div>
    )
}
