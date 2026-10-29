import { Bell, BellOff, BellRing, UserCheck, UsersIcon, type LucideIcon } from '@/lib/icons'
import { COWORKER_MODE_COPY, NOTIFICATION_SCOPE_COPY, type CoworkerMode, type NotificationScope } from '@/lib/notifications/prefs'

export const SCOPE_META: Record<NotificationScope, { label: string; detail: string; icon: LucideIcon }> = {
    everything: { ...NOTIFICATION_SCOPE_COPY.everything, icon: UsersIcon },
    mine: { ...NOTIFICATION_SCOPE_COPY.mine, icon: UserCheck },
    needed: { ...NOTIFICATION_SCOPE_COPY.needed, icon: Bell },
    nothing: { ...NOTIFICATION_SCOPE_COPY.nothing, icon: BellOff },
}

export const COWORKER_MODE_META: Record<CoworkerMode, { label: string; hint: string; icon: LucideIcon }> = {
    default: { ...COWORKER_MODE_COPY.default, icon: Bell },
    everything: { ...COWORKER_MODE_COPY.everything, icon: BellRing },
    muted: { ...COWORKER_MODE_COPY.muted, icon: BellOff },
}
