import { describe, expect, it } from 'vitest'
import { trialArm } from './trial-experiment'

const ids = Array.from({ length: 10_000 }, (_, i) => i + 14_000)

describe('trialArm', () => {
    it('gives a workspace the same arm every time', () => {
        for (const id of ids.slice(0, 100)) expect(trialArm(id)).toBe(trialArm(id))
    })

    it('splits consecutive workspaces close to half and half', () => {
        const card = ids.filter(id => trialArm(id, 0.5) === 'card').length
        expect(card / ids.length).toBeGreaterThan(0.48)
        expect(card / ids.length).toBeLessThan(0.52)
    })

    it('puts everyone on one arm at the ends of the share', () => {
        expect(ids.every(id => trialArm(id, 0) === 'cardless')).toBe(true)
        expect(ids.every(id => trialArm(id, 1) === 'card')).toBe(true)
    })
})
