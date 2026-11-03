import type { CliModels } from '@rerun/contracts'

// In memory, like the plan limits: a reading is only as good as the binary and the account it was
// taken against, and the next one refills it after a restart.
const readings = new Map<string, CliModels>()

export function recordCliModels(connectionId: string, models: string[], version: string | null, outdated: boolean): void {
    if (!models.length) return
    readings.set(connectionId, { models: [...new Set(models)], version, outdated, capturedAt: new Date().toISOString() })
}

export function readCliModels(connectionId: string): CliModels | null {
    return readings.get(connectionId) ?? null
}

export function forgetCliModels(connectionId: string): void {
    readings.delete(connectionId)
}

export function cliModelsFresh(connectionId: string, maxAgeMs: number): boolean {
    const reading = readings.get(connectionId)
    return !!reading && Date.now() - Date.parse(reading.capturedAt) < maxAgeMs
}
