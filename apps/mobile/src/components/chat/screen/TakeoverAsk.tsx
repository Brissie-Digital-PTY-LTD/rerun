import { SymbolView } from 'expo-symbols'
import { Pressable, View } from 'react-native'

import { HitlAction, HitlIcon } from '@/components/chat/hitl/HitlCard'
import { AppText } from '@/components/ui/AppText'
import { useTheme } from '@/theme/theme'
import { spacing } from '@/theme/tokens'

import type { TakeoverRequestState } from './useTakeoverRequest'

// The web's `TakeoverAsk`: what the run asks of the person while it waits on its screen, under the
// screen it is about.
export function TakeoverAsk({ takeover }: { takeover: TakeoverRequestState }) {
    const theme = useTheme()
    const { locked, opened, site } = takeover
    return (
        <View style={{ gap: spacing.md, padding: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2 }}>
                <HitlIcon symbol="display" />
                <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="callout" medium>
                        {takeover.reason}
                    </AppText>
                    <AppText variant="footnote" tone="muted">
                        {opened ? 'The browser is open on your coworker’s desktop. Come back here once you are through.' : site ? `Opens ${site} in your coworker’s browser, for you to drive.` : 'Opens your coworker’s browser, for you to drive.'}
                    </AppText>
                </View>
                <Pressable onPress={takeover.onSkip} disabled={locked} accessibilityRole="button" accessibilityLabel="Skip the browser takeover" hitSlop={12} style={({ pressed }) => ({ paddingTop: 4, opacity: locked ? 0.4 : pressed ? 0.5 : 1 })}>
                    <SymbolView name="xmark" size={13} weight="semibold" tintColor={theme.mutedForeground} />
                </Pressable>
            </View>
            <AppText variant="caption" style={{ color: theme.mutedForeground, opacity: 0.7 }}>
                What you sign in to stays in this coworker’s browser on your machine.
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm }}>
                {opened ? (
                    <>
                        <HitlAction label="Open again" onPress={takeover.onOpen} disabled={locked} />
                        <HitlAction label={takeover.finishing ? 'Closing…' : 'Done'} primary onPress={takeover.onDone} disabled={locked} />
                    </>
                ) : (
                    <>
                        <HitlAction label="Skip" onPress={takeover.onSkip} disabled={locked} />
                        <HitlAction label="Open browser" primary onPress={takeover.onOpen} disabled={locked} />
                    </>
                )}
            </View>
        </View>
    )
}
