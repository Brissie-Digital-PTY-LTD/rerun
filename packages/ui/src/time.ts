export { calendarDaysBetween, messageDayLabel } from '@rerun/contracts'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

export function shortRelativeTime(iso: string): string {
    const date = new Date(iso)
    const diff = Date.now() - date.getTime()

    if (diff < MINUTE) return 'now'
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`
    if (diff < DAY) return `${Math.floor(diff / HOUR)}h`
    if (diff < WEEK) return `${Math.floor(diff / DAY)}d`

    const sameYear = date.getFullYear() === new Date().getFullYear()
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', ...(sameYear ? {} : { year: '2-digit' }) })
}

export function shortUntil(iso: string): string {
    const date = new Date(iso)
    const diff = date.getTime() - Date.now()

    if (diff < MINUTE) return 'now'
    if (diff < HOUR) return `in ${Math.floor(diff / MINUTE)}m`
    if (diff < DAY) return `in ${Math.floor(diff / HOUR)}h`
    if (diff < WEEK) return `in ${Math.floor(diff / DAY)}d`

    const sameYear = date.getFullYear() === new Date().getFullYear()
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', ...(sameYear ? {} : { year: '2-digit' }) })
}

export function fullDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

let clockFormat: Intl.DateTimeFormat | undefined

// The words stay English like the rest of the app, the 12 or 24 hour clock is the browser's.
function clock(): Intl.DateTimeFormat {
    clockFormat ??= new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hourCycle: new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle })
    return clockFormat
}

export function messageTime(iso: string): string {
    return clock().format(new Date(iso))
}
