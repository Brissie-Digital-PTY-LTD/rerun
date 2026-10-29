const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const SOON_MS = 15 * MINUTE

export function countdownShort(remainingMs: number): string {
    if (remainingMs < MINUTE) return `${Math.max(1, Math.ceil(remainingMs / SECOND))}s`
    if (remainingMs < HOUR) return `${Math.round(remainingMs / MINUTE)}m`
    if (remainingMs < DAY) return `${Math.round(remainingMs / HOUR)}h`
    return `${Math.round(remainingMs / DAY)}d`
}

// Past 99 the exact count no longer reads at a glance and only widens the pill.
export const resultsCount = (count: number) => (count > 99 ? '99+' : String(count))

export function isCountdownSoon(remainingMs: number): boolean {
    return remainingMs < SOON_MS
}
