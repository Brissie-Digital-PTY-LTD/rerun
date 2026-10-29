import { type TemplateDocument, templateDocumentSchema } from '@rerun/contracts'
import { describe, expect, it } from 'vitest'
import { META_DESCRIPTION_REQUIREMENT, templateSubmitBlockers, templateSubmitChecklist } from './submit'

function doc(overrides: Record<string, unknown> = {}): TemplateDocument {
    return templateDocumentSchema.parse({
        slug: 'kit',
        title: 'Kit',
        tagline: 'Tag',
        longDescription: 'Desc',
        metaDescription: 'x'.repeat(130),
        agents: [{ key: 'scout', name: 'Scout', setupRequired: false }],
        ...overrides,
    })
}

describe('templateSubmitChecklist', () => {
    it('meets every requirement of a complete free template, with no payout line', () => {
        const checklist = templateSubmitChecklist(doc())
        expect(checklist.every(r => r.met)).toBe(true)
        expect(checklist.map(r => r.label)).not.toContain('A Stripe account that can receive payouts')
    })

    it('treats whitespace as missing text', () => {
        expect(templateSubmitBlockers(doc({ title: ' ', tagline: '  ', longDescription: '\n' }))).toEqual(['a title', 'a tagline', 'a description'])
    })

    it('blocks the install answer both with no agent and with an unanswered one', () => {
        expect(templateSubmitBlockers(doc({ agents: [] }))).toEqual(['at least one captured coworker', 'an install answer for every coworker'])
        const unanswered = doc({ agents: [{ key: 'a', name: 'A', setupRequired: true }, { key: 'b', name: 'B' }] })
        expect(templateSubmitBlockers(unanswered)).toEqual(['an install answer for every coworker'])
    })

    it('asks for a meta description inside the search snippet band', () => {
        const blocker = META_DESCRIPTION_REQUIREMENT.toLowerCase()
        for (const length of [0, 119, 156]) expect(templateSubmitBlockers(doc({ metaDescription: 'x'.repeat(length) }))).toEqual([blocker])
        for (const length of [120, 155]) expect(templateSubmitBlockers(doc({ metaDescription: 'x'.repeat(length) }))).toEqual([])
    })

    it('asks a paid template for payouts, unready by default', () => {
        const paid = doc({ pricingModel: 'recurring', priceAmountCents: 900 })
        expect(templateSubmitBlockers(paid)).toEqual(['a stripe account that can receive payouts'])
        expect(templateSubmitBlockers(paid, { payoutsReady: true })).toEqual([])
    })
})
