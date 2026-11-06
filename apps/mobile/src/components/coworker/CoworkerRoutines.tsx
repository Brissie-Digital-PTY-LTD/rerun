import type { RoutineView } from '@rerun/contracts'
import { Fragment } from 'react'
import { Switch, View } from 'react-native'

import { OPEN_LOCK, type ManageLock } from '@/auth/access'
import { AppText } from '@/components/ui/AppText'
import { Card, GROUPED_ROW_HEIGHT, Separator } from '@/components/ui/GroupedList'
import { Skeleton } from '@/components/ui/Skeleton'
import { spacing } from '@/theme/tokens'

import { CoworkerPage, LoadFailed } from './CoworkerPage'

export const routineKey = (routine: Pick<RoutineView, 'kind' | 'slug'>) => `${routine.kind}:${routine.slug}`

export function whenOf(routine: RoutineView): string {
    if (routine.cronLabel) return routine.cronLabel
    if (routine.runAt) return `Once, ${new Date(routine.runAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
    return routine.kind === 'trigger' ? 'Webhook' : ''
}

type RoutineRowProps = { routine: RoutineView; saving: boolean; readOnly: boolean; onToggle: (enabled: boolean) => void }

function RoutineRow({ routine, saving, readOnly, onToggle }: RoutineRowProps) {
    const when = whenOf(routine)
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: GROUPED_ROW_HEIGHT + 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <AppText variant="body" medium numberOfLines={1}>
                    {routine.name}
                </AppText>
                {when ? (
                    <AppText variant="footnote" tone="muted" numberOfLines={2}>
                        {when}
                    </AppText>
                ) : null}
            </View>
            <Switch value={routine.enabled} disabled={saving || readOnly} onValueChange={onToggle} accessibilityLabel={routine.name} />
        </View>
    )
}

function RoutinesSkeleton() {
    return (
        <Card>
            {[0, 1].map(index => (
                <Fragment key={index}>
                    {index > 0 && <Separator />}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: GROUPED_ROW_HEIGHT + 8, paddingHorizontal: spacing.lg }}>
                        <View style={{ flex: 1, gap: 6 }}>
                            <Skeleton style={{ width: [130, 100][index], height: 14 }} />
                            <Skeleton style={{ width: [90, 150][index], height: 12 }} />
                        </View>
                        <Skeleton style={{ width: 51, height: 31, borderRadius: 16 }} />
                    </View>
                </Fragment>
            ))}
        </Card>
    )
}

type CoworkerRoutinesProps = {
    name: string
    // Null while on its way.
    routines: RoutineView[] | null
    savingKeys: string[]
    onToggle: (routine: RoutineView, enabled: boolean) => void
    failed?: boolean
    // Whether the caller can switch the coworker's routines, and why not when they cannot.
    lock?: ManageLock
    onBack: () => void
}

// What the coworker runs on its own, each with its switch. Creating or changing one goes through the
// chat.
export function CoworkerRoutines({ name, routines, savingKeys, onToggle, failed, lock = OPEN_LOCK, onBack }: CoworkerRoutinesProps) {
    return (
        <CoworkerPage title="Routines" onBack={onBack}>
            <View style={{ gap: spacing.sm }}>
                {!routines ? (
                    failed ? <LoadFailed /> : <RoutinesSkeleton />
                ) : routines.length === 0 ? (
                    <Card>
                        <View style={{ padding: spacing.lg }}>
                            <AppText variant="body" tone="muted">
                                No routine yet.
                            </AppText>
                        </View>
                    </Card>
                ) : (
                    <Card>
                        {routines.map((routine, index) => (
                            <Fragment key={routineKey(routine)}>
                                {index > 0 && <Separator />}
                                <RoutineRow routine={routine} saving={savingKeys.includes(routineKey(routine))} readOnly={lock.locked} onToggle={enabled => onToggle(routine, enabled)} />
                            </Fragment>
                        ))}
                    </Card>
                )}
                {routines && failed && <LoadFailed />}
                <AppText variant="footnote" tone="muted" style={{ paddingHorizontal: spacing.lg }}>
                    {lock.reason ?? `Ask ${name} in the chat to set one up.`}
                </AppText>
            </View>
        </CoworkerPage>
    )
}
