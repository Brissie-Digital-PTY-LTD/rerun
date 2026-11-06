import { messageDayLabel } from '@rerun/contracts'

import { AppText } from '@/components/ui/AppText'
import { messageTime } from '@/lib/time'

export function ChatTimeSeparator({ createdAt }: { createdAt: string }) {
    return (
        <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            <AppText variant="caption" tone="muted" medium>
                {messageDayLabel(createdAt)}
            </AppText>{' '}
            {messageTime(createdAt)}
        </AppText>
    )
}
