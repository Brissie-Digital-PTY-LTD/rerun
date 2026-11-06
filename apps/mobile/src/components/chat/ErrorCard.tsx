import { chatErrorTitle, classifyChatError, friendlyError } from '@rerun/contracts'
import { View } from 'react-native'

import { AppText } from '@/components/ui/AppText'
import { PillButton } from '@/components/ui/PillButton'
import { ProviderLogo } from '@/components/ui/ProviderLogo'
import { useTheme } from '@/theme/theme'
import { radius, spacing, withAlpha } from '@/theme/tokens'

export type ErrorCardActions = {
    onRetry: () => void
    // Sign in again on the connection the coworker runs on.
    onReconnect?: () => void
    onSwitchModel?: () => void
    onConnect?: (provider: 'claude' | 'codex') => void
}

// The web's ProviderErrorNotice and BudgetExhaustedNotice, without what the app cannot sell: a
// refusal that repeats on every send is offered its fix instead of a retry. A fix the screen does not
// offer falls back to Try again.
export function ErrorCard({ message, onRetry, onReconnect, onSwitchModel, onConnect }: { message: string } & ErrorCardActions) {
    const theme = useTheme()
    const kind = classifyChatError(message)
    const budget = kind === 'budget' && onConnect
    const reconnect = kind === 'unauthorized' && onReconnect
    const switchable = (kind === 'usage_limit' || kind === 'provider_error' || kind === 'context_window' || kind === 'overloaded' || kind === 'generic') && onSwitchModel
    // A conversation the coworker cannot reach answers every resend the same way.
    const retry = !budget && !reconnect && kind !== 'session_gone' && (kind === 'overloaded' || kind === 'generic' || kind === 'interrupted' || kind === 'run_in_flight' || kind === 'thinking_replay' || !switchable)

    return (
        <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: withAlpha(theme.destructive, 0.35), backgroundColor: withAlpha(theme.destructive, theme.scheme === 'dark' ? 0.1 : 0.05) }}>
            <AppText variant="headline">{budget ? 'Rerun credits' : (chatErrorTitle(kind, message) ?? 'Something went wrong')}</AppText>
            <AppText variant="callout" tone="muted">
                {budget ? "You've used up your Rerun credits for this period. Already paying for Claude or ChatGPT? Run your coworkers on that plan, at no extra cost here." : friendlyError(message)}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {budget && (
                    <>
                        <PillButton label="Connect Claude" icon={<ProviderLogo provider="claude" size={14} />} onPress={() => onConnect('claude')} />
                        <PillButton label="Connect ChatGPT" icon={<ProviderLogo provider="openai" size={14} color={theme.primaryForeground} />} onPress={() => onConnect('codex')} />
                    </>
                )}
                {reconnect && <PillButton label="Reconnect" onPress={onReconnect} />}
                {retry && <PillButton label="Try again" variant="secondary" onPress={onRetry} />}
                {switchable && <PillButton label="Switch model" variant={retry ? 'secondary' : 'primary'} onPress={onSwitchModel} />}
            </View>
        </View>
    )
}
