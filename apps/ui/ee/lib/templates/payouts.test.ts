import { describe, expect, it } from 'vitest'
import { payoutStateLabel, payoutStateTone, requirementLabel, saleKindLabel, saleKindTone } from './payouts'

describe('requirementLabel', () => {
    it('spells out a known Stripe requirement', () => {
        expect(requirementLabel('external_account')).toBe('A bank account')
        expect(requirementLabel('individual.verification.document')).toBe('An identity document')
    })

    it('humanises the last segment of an unknown one rather than hiding it', () => {
        expect(requirementLabel('company.tax_id')).toBe('Tax id')
        expect(requirementLabel('representative')).toBe('Representative')
    })

    it('keeps an empty requirement empty', () => {
        expect(requirementLabel('')).toBe('')
    })
})

describe('payout states', () => {
    it('reads a restricted account as red and a ready one as green', () => {
        expect(payoutStateTone('restricted')).toBe('red')
        expect(payoutStateTone('ready')).toBe('green')
        expect(payoutStateLabel('pending_verification')).toBe('In review')
    })
})

describe('sale kinds', () => {
    it('labels a recurring sale as monthly and falls back on the raw kind', () => {
        expect(saleKindLabel('recurring')).toBe('Monthly')
        expect(saleKindLabel('dispute')).toBe('dispute')
        expect(saleKindTone('refund')).toBe('orange')
        expect(saleKindTone('dispute')).toBe('neutral')
    })
})
