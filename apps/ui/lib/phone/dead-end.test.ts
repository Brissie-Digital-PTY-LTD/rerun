import { describe, expect, it } from 'vitest'

import { isDeadEndReason } from './dead-end'

describe('isDeadEndReason', () => {
    it('treats a number Bird refuses as a dead end', () => {
        expect(isDeadEndReason('undeliverable')).toBe(true)
        expect(isDeadEndReason('blocked')).toBe(true)
    })

    it('treats a number another account already holds as a dead end', () => {
        expect(isDeadEndReason('taken')).toBe(true)
    })

    it('leaves a refusal another try can get past alone', () => {
        expect(isDeadEndReason('too_soon')).toBe(false)
        expect(isDeadEndReason('wrong_code')).toBe(false)
        expect(isDeadEndReason(undefined)).toBe(false)
    })
})
