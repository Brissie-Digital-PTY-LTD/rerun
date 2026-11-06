import { router } from 'expo-router'
import { View } from 'react-native'

import { PhoneField } from '@/components/auth/PhoneField'
import { useSignInFlow } from '@/components/auth/SignInFlow'
import { StepTitle } from '@/components/auth/steps/StepTitle'
import { CHANNEL_LABELS, usePhoneCode } from '@/components/auth/useSignInActions'
import { AppText } from '@/components/ui/AppText'
import { Button } from '@/components/ui/Button'
import { spacing } from '@/theme/tokens'

export function PhoneStep() {
    const { country, phone, setPhone } = useSignInFlow()
    const { channels, send, sending, error, clearError } = usePhoneCode()

    return (
        <>
            <StepTitle title="Your phone number" />
            <PhoneField
                country={country}
                value={phone}
                autoFocus
                onChangeText={text => {
                    setPhone(text)
                    clearError()
                }}
                onPickCountry={() => router.push('/sign-in/country')}
                onSubmit={() => channels[0] && send(channels[0])}
                invalid={Boolean(error)}
            />
            {error && (
                <AppText variant="footnote" tone="destructive">
                    {error}
                </AppText>
            )}
            {channels.length === 0 ? (
                <AppText variant="callout" tone="muted" style={{ textAlign: 'center' }}>
                    We can&apos;t send codes to this country yet.
                </AppText>
            ) : (
                <View style={{ gap: spacing.sm }}>
                    {channels.map((channel, index) => (
                        <Button key={channel} label={CHANNEL_LABELS[channel]} size="lg" variant={index === 0 ? 'default' : 'outline'} loading={sending === channel} disabled={sending !== null || !phone} onPress={() => send(channel)} />
                    ))}
                </View>
            )}
            <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                By continuing, you agree to be contacted by Rerun on WhatsApp or SMS.
            </AppText>
        </>
    )
}
