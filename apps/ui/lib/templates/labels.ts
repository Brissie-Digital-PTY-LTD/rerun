import cronstrue from 'cronstrue'

export function titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

export function scheduleLabel(cron: string): string {
    try {
        return cronstrue.toString(cron, { throwExceptionOnParseError: true, verbose: false })
    } catch {
        return cron
    }
}
