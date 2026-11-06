import { COWORKER_MODE_COPY, EMAIL_CATEGORIES, EMAIL_CATEGORY_LABELS, NOTIFICATION_SCOPE_COPY, NOTIFICATION_SCOPES, coworkerRuleOf, hasOwnRule, type CoworkerRule, type NotificationPrefs, type NotificationPrefsPatch, type NotificationScope } from '@rerun/contracts'
import type { PermissionStatus } from 'expo-notifications'
import { SymbolView, type SFSymbol } from 'expo-symbols'
import { ActionSheetIOS, Pressable, View } from 'react-native'

import { AppText } from '@/components/ui/AppText'
import { Badge } from '@/components/ui/Badge'
import { Card, CheckRow, GROUPED_ROW_HEIGHT, ICON_ROW_INSET, Section, SectionTitle, Separator, SettingsRow, SwitchRow } from '@/components/ui/GroupedList'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTheme } from '@/theme/theme'
import { spacing } from '@/theme/tokens'

export type CoworkerOption = { id: string; name: string }

export const SCOPE_SYMBOLS: Record<NotificationScope, SFSymbol> = {
    everything: 'person.3',
    mine: 'person.crop.circle.badge.checkmark',
    needed: 'bell',
    nothing: 'bell.slash',
}

export function ruleValue(rule: CoworkerRule): string {
    if (rule.mode !== 'default') return COWORKER_MODE_COPY[rule.mode].label
    return rule.follow ? 'Follows tasks' : 'Your setting'
}

type NotificationCenterProps = {
    prefs: NotificationPrefs | null
    failed: boolean
    coworkers: CoworkerOption[] | null
    push: PermissionStatus | null
    onEnablePush: () => void
    onOpenIosSettings: () => void
    onPatch: (patch: NotificationPrefsPatch) => void
    onOpenCoworker: (coworker: CoworkerOption) => void
}

export function Footnote({ children }: { children: string }) {
    return (
        <AppText variant="footnote" tone="muted" style={{ paddingHorizontal: spacing.lg }}>
            {children}
        </AppText>
    )
}

function PushOff({ push, onEnablePush, onOpenIosSettings }: Pick<NotificationCenterProps, 'onEnablePush' | 'onOpenIosSettings'> & { push: PermissionStatus }) {
    return (
        <View style={{ gap: spacing.sm }}>
            <Card>
                <SettingsRow icon="bell.slash" label="Push notifications" value="Off" />
                <Separator inset={ICON_ROW_INSET} />
                {push === 'undetermined' ? <SettingsRow label="Turn on" onPress={onEnablePush} /> : <SettingsRow label="Open iOS Settings" accessory="external" onPress={onOpenIosSettings} />}
            </Card>
            <Footnote>Nothing below reaches this iPhone until push is on.</Footnote>
        </View>
    )
}

// The rule is what the row is for: a long name gives way before it does.
function CoworkerRuleRow({ name, value, onPress }: { name: string; value: string; onPress: () => void }) {
    const theme = useTheme()
    return (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, ${value}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: GROUPED_ROW_HEIGHT, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: pressed ? theme.muted : 'transparent' })}>
            <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {name}
            </AppText>
            <AppText variant="body" tone="muted" numberOfLines={1}>
                {value}
            </AppText>
            <SymbolView name="chevron.right" size={13} weight="medium" tintColor={theme.mutedForeground} />
        </Pressable>
    )
}

function CenterSkeleton() {
    return (
        <View style={{ gap: spacing.xl }}>
            {[4, 1, 2].map((rows, index) => (
                <View key={index} style={{ gap: spacing.sm }}>
                    <Skeleton style={{ width: 120, height: 12, marginLeft: spacing.lg }} />
                    <Card>
                        {Array.from({ length: rows }, (_, row) => (
                            <View key={row} style={{ height: 52, justifyContent: 'center', paddingHorizontal: spacing.lg }}>
                                <Skeleton style={{ width: '60%', height: 14 }} />
                            </View>
                        ))}
                    </Card>
                </View>
            ))}
        </View>
    )
}

// The web's notification settings: which runs are worth hearing about, the email, a rule for a
// coworker apart, and the account emails. Toast and sound live in the browser, so they stay there.
export function NotificationCenter({ prefs, failed, coworkers, push, onEnablePush, onOpenIosSettings, onPatch, onOpenCoworker }: NotificationCenterProps) {
    const pushOff = push !== null && push !== 'granted' && <PushOff push={push} onEnablePush={onEnablePush} onOpenIosSettings={onOpenIosSettings} />

    if (!prefs) {
        return (
            <>
                {pushOff}
                {failed ? <Footnote>Could not load your settings. Try again in a moment.</Footnote> : <CenterSkeleton />}
            </>
        )
    }

    const silent = prefs.scope === 'nothing'
    const listed = (coworkers ?? []).filter(coworker => hasOwnRule(coworkerRuleOf(prefs, coworker.id)))
    const addable = (coworkers ?? []).filter(coworker => !listed.includes(coworker))

    const pickCoworker = () =>
        ActionSheetIOS.showActionSheetWithOptions({ title: 'Every run of this coworker reaches you', options: [...addable.map(coworker => coworker.name), 'Cancel'], cancelButtonIndex: addable.length }, index => {
            const coworker = addable[index]
            if (coworker) onPatch({ coworkers: { [coworker.id]: { ...coworkerRuleOf(prefs, coworker.id), mode: 'everything' } } })
        })

    return (
        <>
            {pushOff}

            <Section title="Notify me about">
                {NOTIFICATION_SCOPES.map((scope, index) => (
                    <View key={scope}>
                        {index > 0 && <Separator inset={ICON_ROW_INSET} />}
                        <CheckRow testID={`scope-${scope}`} icon={SCOPE_SYMBOLS[scope]} label={NOTIFICATION_SCOPE_COPY[scope].label} detail={NOTIFICATION_SCOPE_COPY[scope].detail} badge={scope === 'mine' ? <Badge label="Recommended" tone="brand" size="xs" /> : undefined} checked={prefs.scope === scope} onPress={() => onPatch({ scope })} />
                    </View>
                ))}
            </Section>

            <View style={{ gap: spacing.sm }}>
                <Card>
                    <SwitchRow testID="switch-email" label="Email" value={prefs.email} disabled={silent} onValueChange={email => onPatch({ email })} />
                </Card>
                <Footnote>When it needs you while you are away. One email per incident, never one per run.</Footnote>
            </View>

            <View style={{ gap: spacing.sm }}>
                <SectionTitle>Per coworker</SectionTitle>
                <Card>
                    {listed.map(coworker => (
                        <View key={coworker.id}>
                            <CoworkerRuleRow name={coworker.name} value={ruleValue(coworkerRuleOf(prefs, coworker.id))} onPress={() => onOpenCoworker(coworker)} />
                            <Separator />
                        </View>
                    ))}
                    <SettingsRow icon="plus" label="Add coworker" loading={coworkers === null} disabled={coworkers !== null && addable.length === 0} onPress={coworkers === null ? undefined : pickCoworker} />
                </Card>
                <Footnote>{listed.length === 0 ? 'Every coworker follows the rule above.' : 'Also set from each coworker’s details.'}</Footnote>
            </View>

            <Section title="Account emails">
                {EMAIL_CATEGORIES.map((category, index) => (
                    <View key={category}>
                        {index > 0 && <Separator />}
                        <SwitchRow label={EMAIL_CATEGORY_LABELS[category]} value={prefs.categories[category]} onValueChange={on => onPatch({ categories: { [category]: on } })} />
                    </View>
                ))}
            </Section>
        </>
    )
}
