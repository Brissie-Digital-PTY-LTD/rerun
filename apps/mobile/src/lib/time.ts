import { messageDayLabel } from '@rerun/contracts'
import { getCalendars } from 'expo-localization'

let clockFormat: Intl.DateTimeFormat | undefined

// The words stay English like the rest of the app, the 12 or 24 hour clock is the phone's.
function clock(): Intl.DateTimeFormat {
    clockFormat ??= new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: !getCalendars()[0]?.uses24hourClock })
    return clockFormat
}

export function messageTime(iso: string): string {
    return clock().format(new Date(iso))
}

export function messageStamp(iso: string): string {
    return `${messageDayLabel(iso)} ${messageTime(iso)}`
}
