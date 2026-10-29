import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function repoRoot(): string {
    let dir = dirname(fileURLToPath(import.meta.url))
    while (dir !== dirname(dir)) {
        if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir
        dir = dirname(dir)
    }
    return dir
}

const startedAt = new Date().toISOString()

let commit: string | null
try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot(), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null
} catch {
    commit = null
}

export function buildCommit(): string | null {
    return commit
}

export function processStartedAt(): string {
    return startedAt
}
