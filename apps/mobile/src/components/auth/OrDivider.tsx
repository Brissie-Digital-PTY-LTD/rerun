import { View } from 'react-native'

import { AppText } from '@/components/ui/AppText'
import { useTheme } from '@/theme/theme'
import { spacing } from '@/theme/tokens'

export function OrDivider() {
    const theme = useTheme()
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            <AppText variant="footnote" tone="muted">
                Or
            </AppText>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        </View>
    )
}
