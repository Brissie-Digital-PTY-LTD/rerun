import { afterEach, describe, expect, it, vi } from 'vitest'
import { isTrialCardReuseBlocked, ownsTrialClaim } from './trial-card'

const claim = (id: string, workspace_id: number | null, created_at: string) => ({ id, workspace_id, created_at })

describe('ownsTrialClaim', () => {
    it('gives the trial to a card nobody has used yet', () => {
        expect(ownsTrialClaim([], 42)).toBe(true)
    })

    it('keeps the trial with the workspace that spent it first', () => {
        const claims = [claim('a', 10, '2026-09-01T10:00:00Z'), claim('b', 20, '2026-09-05T10:00:00Z')]
        expect(ownsTrialClaim(claims, 10)).toBe(true)
        expect(ownsTrialClaim(claims, 20)).toBe(false)
    })

    it('reads the same verdict whatever order the rows come back in', () => {
        const claims = [claim('b', 20, '2026-09-05T10:00:00Z'), claim('a', 10, '2026-09-01T10:00:00Z')]
        expect(ownsTrialClaim(claims, 20)).toBe(false)
    })

    it('lets a comped workspace re-enter its own trial', () => {
        expect(ownsTrialClaim([claim('a', 10, '2026-09-01T10:00:00Z')], 10)).toBe(true)
    })

    it('does not hand the trial back when the workspace that spent it was deleted', () => {
        const claims = [claim('a', null, '2026-09-01T10:00:00Z'), claim('b', 20, '2026-09-05T10:00:00Z')]
        expect(ownsTrialClaim(claims, 20)).toBe(false)
    })

    it('breaks a tie on created_at by id, so both racing checkouts agree', () => {
        const claims = [claim('b', 20, '2026-09-01T10:00:00Z'), claim('a', 10, '2026-09-01T10:00:00Z')]
        expect(ownsTrialClaim(claims, 10)).toBe(true)
        expect(ownsTrialClaim(claims, 20)).toBe(false)
    })
})

describe('isTrialCardReuseBlocked', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('is off when the variable is not set', () => {
        vi.stubEnv('TRIAL_CARD_REUSE_BLOCK', '')
        expect(isTrialCardReuseBlocked()).toBe(false)
    })

    it('is on only for the literal true', () => {
        vi.stubEnv('TRIAL_CARD_REUSE_BLOCK', 'true')
        expect(isTrialCardReuseBlocked()).toBe(true)
        vi.stubEnv('TRIAL_CARD_REUSE_BLOCK', '1')
        expect(isTrialCardReuseBlocked()).toBe(false)
    })
})
