import { describe, expect, it } from 'vitest'
import { buildCommit, processStartedAt } from './build-info.js'

describe('build info', () => {
    it('reports a short commit hash or null outside a git checkout', () => {
        const commit = buildCommit()
        if (commit !== null) expect(commit).toMatch(/^[0-9a-f]{4,40}$/)
    })

    it('reports a stable process start time', () => {
        const startedAt = processStartedAt()
        expect(Number.isNaN(Date.parse(startedAt))).toBe(false)
        expect(Date.parse(startedAt)).toBeLessThanOrEqual(Date.now())
        expect(processStartedAt()).toBe(startedAt)
    })
})
