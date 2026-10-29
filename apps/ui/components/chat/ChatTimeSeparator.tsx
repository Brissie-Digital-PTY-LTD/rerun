import { messageDayLabel, messageTime } from '@/lib/time'

export function ChatTimeSeparator({ createdAt }: { createdAt: string }) {
    return (
        <time dateTime={createdAt} className="block text-center text-muted-foreground text-xs">
            <span className="font-medium">{messageDayLabel(createdAt)}</span> {messageTime(createdAt)}
        </time>
    )
}
