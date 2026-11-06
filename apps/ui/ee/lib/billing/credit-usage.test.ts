import { describe, expect, it } from 'vitest'

import { creditBalance, runsOutOn, summarizeCreditUsage, type CreditUsageRow } from './credit-usage'

const CREDIT = 10_000
const period = { start: new Date('2026-10-12T09:00:00Z'), end: new Date('2026-11-12T09:00:00Z') }
const now = new Date('2026-10-14T15:00:00Z')
const agents = [{ id: 'row-lea', name: 'Léa', engine_agent_id: 'lea' }]

const row = (overrides: Partial<CreditUsageRow>): CreditUsageRow => ({ day: '2026-10-13', kind: 'ai', source: 'balanced', engine_agent_id: 'lea', micros: 10 * CREDIT, calls: 4, ...overrides })

describe('summarizeCreditUsage', () => {
    it('lays every day of the period so far, the quiet ones at zero', () => {
        const usage = summarizeCreditUsage([row({ day: '2026-10-13' }), row({ day: '2026-10-13', kind: 'data', source: 'people.email.find', micros: 3 * CREDIT })], agents, period, now)

        expect(usage.days).toEqual([
            { day: '2026-10-12', aiMicros: 0, dataMicros: 0 },
            { day: '2026-10-13', aiMicros: 10 * CREDIT, dataMicros: 3 * CREDIT },
            { day: '2026-10-14', aiMicros: 0, dataMicros: 0 },
        ])
    })

    it('adds up each source and each coworker, the unnamed ones last', () => {
        const usage = summarizeCreditUsage([row({ day: '2026-10-12' }), row({ day: '2026-10-13' }), row({ engine_agent_id: null, source: 'smart', micros: 50 * CREDIT })], agents, period, now)

        expect(usage.bySource).toEqual([
            { source: { kind: 'ai', tier: 'smart' }, micros: 50 * CREDIT, calls: 4 },
            { source: { kind: 'ai', tier: 'balanced' }, micros: 20 * CREDIT, calls: 8 },
        ])
        expect(usage.byCoworker.map(total => total.coworker?.name ?? null)).toEqual(['Léa', null])
    })

    it('lists the latest charges newest first', () => {
        const usage = summarizeCreditUsage([row({ day: '2026-10-12' }), row({ day: '2026-10-14', kind: 'data', source: 'google.serp.maps' })], agents, period, now)

        expect(usage.latest.map(charge => charge.day)).toEqual(['2026-10-14', '2026-10-12'])
        expect(usage.latest[0].coworker).toEqual({ id: 'row-lea', name: 'Léa' })
    })

    it('leaves out a capability the catalog no longer knows', () => {
        const usage = summarizeCreditUsage([row({ kind: 'data', source: 'gone.capability' })], agents, period, now)

        expect(usage.bySource).toEqual([])
        expect(usage.latest).toEqual([])
    })
})

describe('creditBalance', () => {
    it('splits what was spent the way the events did', () => {
        const usage = {
            bySource: [
                { source: { kind: 'ai', tier: 'smart' } as const, micros: 30, calls: 1 },
                { source: { kind: 'data', capability: 'people.email.find' } as const, micros: 10, calls: 1 },
            ],
        }

        expect(creditBalance({ budgetMicros: 500 * CREDIT, usedMicros: 400 * CREDIT, topupMicros: 100 * CREDIT }, usage)).toEqual({
            usedAiMicros: 300 * CREDIT,
            usedDataMicros: 100 * CREDIT,
            monthLeftMicros: 100 * CREDIT,
            topupLeftMicros: 100 * CREDIT,
            leftMicros: 200 * CREDIT,
            wholeMicros: 600 * CREDIT,
        })
    })

    it('measures a month spent past its budget against what it spent', () => {
        const balance = creditBalance({ budgetMicros: 500 * CREDIT, usedMicros: 550 * CREDIT, topupMicros: 50 * CREDIT }, null)

        expect(balance).toMatchObject({ monthLeftMicros: 0, leftMicros: 50 * CREDIT, wholeMicros: 600 * CREDIT, usedAiMicros: 550 * CREDIT })
    })
})

describe('runsOutOn', () => {
    const range = { start: period.start.toISOString(), end: period.end.toISOString() }

    it('names the day the pace runs out before the period ends', () => {
        const balance = creditBalance({ budgetMicros: 500 * CREDIT, usedMicros: 200 * CREDIT, topupMicros: 0 }, null)

        expect(runsOutOn(balance, range, new Date('2026-10-14T09:00:00Z'))?.toISOString().slice(0, 10)).toBe('2026-10-17')
    })

    it('says nothing when the credit lasts the period', () => {
        const balance = creditBalance({ budgetMicros: 500 * CREDIT, usedMicros: 20 * CREDIT, topupMicros: 0 }, null)

        expect(runsOutOn(balance, range, now)).toBeNull()
    })
})
