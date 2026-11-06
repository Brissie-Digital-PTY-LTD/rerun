import type { CoworkerRule, InboxItem } from '@rerun/contracts'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Alert, ScrollView, View } from 'react-native'
import Animated, { FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { HomeSkeleton } from '@/components/home/HomeSkeleton'
import { inboxSections } from '@/components/inbox/inbox'
import { InboxRow } from '@/components/inbox/InboxRow'
import { AppText } from '@/components/ui/AppText'
import { GlassButton, GLASS_BUTTON_SIZE } from '@/components/ui/GlassButton'
import { PillButton } from '@/components/ui/PillButton'
import { useInbox } from '@/data/InboxProvider'
import { useNotificationPrefs } from '@/data/useNotificationPrefs'
import { layoutTransition as layout } from '@/theme/motion'
import { useTheme } from '@/theme/theme'
import { spacing } from '@/theme/tokens'

// The web's inbox: what waits on the person, then the finished runs they have not looked at.
export function InboxSheet() {
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const inbox = useInbox()
    const { ruleOf, setCoworkerRule } = useNotificationPrefs()
    const items = inbox.state === 'ready' ? inbox.items : []
    const running = inbox.state === 'ready' ? inbox.running : 0
    // Everything is cleared on the hub, not only the rows shown: never off the copy kept from the last visit.
    const fresh = inbox.state === 'ready' && inbox.fresh

    // Opening a finished run is reading it, as on the web; a request stays until it is answered.
    const open = (item: InboxItem) => {
        if (item.status === 'done') inbox.markRead([item])
        router.back()
        router.push({ pathname: '/chat/[id]', params: { id: item.sessionId, to: item.agentId } })
    }

    const changeRule = (item: InboxItem, rule: CoworkerRule, done: string) => {
        const previous = ruleOf(item.agentId)
        setCoworkerRule(item.agentId, rule)
        Alert.alert(done, undefined, [{ text: 'Undo', onPress: () => previous && setCoworkerRule(item.agentId, previous) }, { text: 'OK', style: 'cancel' }])
    }

    const openSettings = (item: InboxItem) => router.push({ pathname: '/settings/coworker/[id]', params: { id: item.agentId, name: item.agentName } })

    const confirmMarkAll = () =>
        Alert.alert('Mark everything as read?', `${items.length} item${items.length === 1 ? '' : 's'} will leave this list. Requests still waiting on an answer are cleared too, without being answered.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Mark all as read', onPress: inbox.markAllRead },
        ])

    // A form sheet lays out its scroll view itself: the header lives inside it, or the list covers it.
    return (
        <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}>
            <View collapsable={false} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
                <GlassButton symbol="xmark" label="Close" onPress={() => router.back()} />
                <View style={{ width: GLASS_BUTTON_SIZE }} />
                <AppText variant="headline" numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ flex: 1, textAlign: 'center' }}>
                    Notifications
                </AppText>
                <GlassButton symbol="gearshape" label="Notification settings" onPress={() => router.push('/settings/notifications')} />
                <GlassButton symbol="checkmark" label="Mark all as read" disabled={items.length === 0 || !fresh} onPress={confirmMarkAll} />
            </View>

            {running > 0 && (
                <AppText variant="footnote" tone="muted" maxFontSizeMultiplier={1.4} style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.sm }}>
                    {`${running} task${running === 1 ? '' : 's'} running`}
                </AppText>
            )}

            {inbox.state === 'loading' && <HomeSkeleton rows={4} />}

            {inbox.state === 'error' && (
                <View style={{ alignItems: 'flex-start', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
                    <AppText variant="callout" tone="muted">
                        We could not load your notifications.
                    </AppText>
                    <PillButton label="Retry" variant="secondary" onPress={inbox.reload} />
                </View>
            )}

            {inbox.state === 'ready' && items.length === 0 && (
                <View style={{ alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl }}>
                    <SymbolView name="tray" size={28} tintColor={theme.mutedForeground} />
                    <AppText variant="headline">Nothing to handle</AppText>
                    <AppText variant="callout" tone="muted" style={{ textAlign: 'center' }}>
                        When a coworker needs you or finishes a task, it lands here.
                    </AppText>
                </View>
            )}

            {inboxSections(items).map((section, index) => (
                <Animated.View key={section.title} layout={layout} style={{ marginTop: index === 0 ? 0 : spacing.md }}>
                    <AppText variant="footnote" tone="muted" medium maxFontSizeMultiplier={1.4} style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.sm }}>
                        {section.title}
                        <AppText variant="footnote" tone="muted">{`  ${section.items.length}`}</AppText>
                    </AppText>
                    {section.items.map(item => (
                        <Animated.View key={item.id} layout={layout} exiting={FadeOut.duration(120)}>
                            <InboxRow item={item} onOpen={open} onMarkRead={row => inbox.markRead([row])} rule={ruleOf(item.agentId)} onRule={changeRule} onSettings={openSettings} />
                        </Animated.View>
                    ))}
                </Animated.View>
            ))}
        </ScrollView>
    )
}
