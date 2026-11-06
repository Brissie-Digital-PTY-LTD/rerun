import type { CoworkerRule, InboxItem } from '@rerun/contracts'
import * as Haptics from 'expo-haptics'
import { SymbolView } from 'expo-symbols'
import { useRef } from 'react'
import { ActionSheetIOS, Pressable, View } from 'react-native'
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'

import { AVATAR } from '@/components/home/CoworkerRow'
import { minutesSince } from '@/components/home/board'
import { moodOfInbox, STATUS_SENTENCE } from '@/components/inbox/inbox'
import { AppText } from '@/components/ui/AppText'
import { CoworkerAvatar } from '@/components/ui/CoworkerAvatar'
import { timeAgo } from '@/components/ui/status'
import { useTheme } from '@/theme/theme'
import { brand, spacing } from '@/theme/tokens'

const ACTION_WIDTH = 96

type InboxRowProps = {
    item: InboxItem
    onOpen: (item: InboxItem) => void
    onMarkRead: (item: InboxItem) => void
    // The caller's rule for the row's coworker, null until read: only the settings link is offered then.
    rule: CoworkerRule | null
    onRule: (item: InboxItem, rule: CoworkerRule, done: string) => void
    onSettings: (item: InboxItem) => void
}

// One row of the web's inbox. The web's hover button is a swipe here, and a long press for whoever
// does not swipe; the long press also holds the web's ⋯, which turns off why the row reached you.
export function InboxRow({ item, onOpen, onMarkRead, rule, onRule, onSettings }: InboxRowProps) {
    const theme = useTheme()
    const swipeable = useRef<SwipeableMethods>(null)
    const minutes = minutesSince(item.updatedAt)
    const headline = item.message ?? item.title
    const detail = item.message ? `${item.agentName} · ${item.title}` : `${item.agentName} ${STATUS_SENTENCE[item.status]}`

    const markRead = () => {
        Haptics.selectionAsync()
        onMarkRead(item)
    }

    const askWhatToDo = () => {
        const actions: { label: string; run: () => void }[] = [{ label: 'Mark as read', run: markRead }]
        if (rule?.follow) actions.push({ label: 'Stop following its scheduled tasks', run: () => onRule(item, { ...rule, follow: false }, `You no longer follow ${item.agentName}'s scheduled tasks.`) })
        if (rule && rule.mode !== 'muted') actions.push({ label: `Mute ${item.agentName}`, run: () => onRule(item, { ...rule, mode: 'muted' }, `${item.agentName} is muted.`) })
        actions.push({ label: 'Notification settings', run: () => onSettings(item) })
        ActionSheetIOS.showActionSheetWithOptions({ options: [...actions.map(action => action.label), 'Cancel'], cancelButtonIndex: actions.length }, index => actions[index]?.run())
    }

    return (
        <ReanimatedSwipeable
            ref={swipeable}
            friction={2}
            rightThreshold={ACTION_WIDTH / 2}
            overshootRight={false}
            onSwipeableOpen={markRead}
            renderRightActions={() => (
                <Pressable onPress={() => swipeable.current?.close()} accessibilityElementsHidden style={{ width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: brand.base }}>
                    <SymbolView name="checkmark" size={18} weight="semibold" tintColor="#ffffff" />
                    <AppText variant="caption" medium maxFontSizeMultiplier={1.2} style={{ color: '#ffffff' }}>
                        Read
                    </AppText>
                </Pressable>
            )}
        >
            <Pressable
                onPress={() => onOpen(item)}
                onLongPress={askWhatToDo}
                accessibilityRole="button"
                accessibilityLabel={[headline, detail].join(', ')}
                accessibilityHint="Opens the conversation"
                accessibilityActions={[{ name: 'markRead', label: 'Mark as read' }]}
                onAccessibilityAction={event => event.nativeEvent.actionName === 'markRead' && markRead()}
                style={({ pressed }) => ({ backgroundColor: pressed ? theme.muted : theme.background })}
            >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.xl }}>
                    <View style={{ paddingTop: 2 }}>
                        <CoworkerAvatar coworker={{ id: item.agentId, kind: 'coworker', status: moodOfInbox(item.status) }} size={AVATAR} facing="right" animated={false} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                            <AppText variant="callout" medium numberOfLines={2} maxFontSizeMultiplier={1.4} style={{ flex: 1 }}>
                                {headline}
                            </AppText>
                            {minutes !== null && (
                                <AppText variant="footnote" tone="muted" maxFontSizeMultiplier={1.4}>
                                    {timeAgo(minutes)}
                                </AppText>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <AppText variant="footnote" tone="muted" numberOfLines={1} maxFontSizeMultiplier={1.4} style={{ flex: 1 }}>
                                {detail}
                            </AppText>
                            {item.count > 1 && (
                                <AppText variant="footnote" tone="muted" maxFontSizeMultiplier={1.4} style={{ fontVariant: ['tabular-nums'] }}>
                                    {`×${item.count}`}
                                </AppText>
                            )}
                        </View>
                    </View>
                </View>
            </Pressable>
        </ReanimatedSwipeable>
    )
}
