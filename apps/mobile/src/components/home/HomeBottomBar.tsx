import { View } from 'react-native'

import { InboxButton } from '@/components/home/InboxButton'
import { SearchBar } from '@/components/home/SearchBar'
import { spacing } from '@/theme/tokens'

export function HomeBottomBar({ count, onSearch, onInbox }: { count: number; onSearch: () => void; onInbox: () => void }) {
    return (
        <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg }}>
            <InboxButton count={count} onPress={onInbox} />
            <SearchBar onPress={onSearch} />
        </View>
    )
}
