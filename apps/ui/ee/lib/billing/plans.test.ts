import { describe, expect, it } from 'vitest'
import {
    MICROS_PER_USD,
    agentStops,
    baseLimitsToColumns,
    basePriceCents,
    isModelAccess,
    packsForAgents,
    parsePriceArm,
    perMonthCents,
    planDiscountCents,
    planPriceCents,
    quantitiesToColumns,
    rerunCreditTotalMicros,
    yearlyDiscountPercent,
} from './plans'

describe('quantitiesToColumns', () => {
    it('derives the base plan limits from zero add-ons, with unlimited seats even on a trial', () => {
        expect(baseLimitsToColumns()).toEqual({ max_agents: 5, max_seats: null, model_access: 'best', custom_integrations: true, rerun_budget_micros: 5 * MICROS_PER_USD })
    })

    it('adds five agents per pack and ten dollars per credit pack', () => {
        expect(quantitiesToColumns({ agent_pack: 2, credit_pack: 3, linkedin_slot: 0, whatsapp_slot: 0 })).toEqual({
            max_agents: 15,
            max_seats: null,
            model_access: 'best',
            custom_integrations: true,
            rerun_budget_micros: 35 * MICROS_PER_USD,
        })
    })
})

describe('plan prices', () => {
    it('bills the base plus every add-on, monthly or yearly', () => {
        expect(planPriceCents({ agent_pack: 3, credit_pack: 1, linkedin_slot: 0, whatsapp_slot: 0 }, 'monthly')).toBe(4900 + 3 * 1000 + 1000)
        expect(planPriceCents({ agent_pack: 3, credit_pack: 1, linkedin_slot: 0, whatsapp_slot: 0 }, 'yearly')).toBe(46800 + 3 * 9600 + 12000)
    })

    it('brings a yearly plan back to one month', () => {
        expect(perMonthCents({ agent_pack: 0, credit_pack: 0, linkedin_slot: 0, whatsapp_slot: 0 }, 'yearly')).toBe(3900)
        expect(perMonthCents({ agent_pack: 1, credit_pack: 0, linkedin_slot: 0, whatsapp_slot: 0 }, 'monthly')).toBe(5900)
    })

    it('rounds the yearly saving to a whole percentage', () => {
        expect(yearlyDiscountPercent()).toBe(20)
    })
})

describe('the arms of the price test', () => {
    it('prices the base plan per arm and leaves the add-ons alone', () => {
        expect(basePriceCents('49')).toBe(4900)
        expect(basePriceCents('29')).toBe(2900)
        expect(planPriceCents({ agent_pack: 1, credit_pack: 1, linkedin_slot: 0, whatsapp_slot: 0 }, 'monthly', '29')).toBe(2900 + 1000 + 1000)
        expect(planPriceCents({ agent_pack: 1, credit_pack: 0, linkedin_slot: 0, whatsapp_slot: 0 }, 'yearly', '29')).toBe(27600 + 9600)
    })

    it('brings the yearly plan of the $29 arm back to $23 a month', () => {
        expect(basePriceCents('29', 'yearly')).toBe(27600)
        expect(perMonthCents({ agent_pack: 0, credit_pack: 0, linkedin_slot: 0, whatsapp_slot: 0 }, 'yearly', '29')).toBe(2300)
    })

    it('prices at the list price whoever passes no arm', () => {
        expect(planPriceCents({ agent_pack: 0, credit_pack: 0, linkedin_slot: 0, whatsapp_slot: 0 }, 'monthly')).toBe(4900)
    })

    it('reads a missing or unknown arm as the default price, not the list price', () => {
        expect(parsePriceArm('29')).toBe('29')
        expect(parsePriceArm('49')).toBe('49')
        expect(parsePriceArm(null)).toBe('29')
        expect(parsePriceArm('39')).toBe('29')
        expect(basePriceCents(parsePriceArm(null))).toBe(2900)
    })
})

describe('agent stops', () => {
    it('runs from the base plan to the slider cap in packs of five', () => {
        expect(agentStops()).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50])
    })

    it('rounds an agent count up to the packs that hold it', () => {
        expect(packsForAgents(5)).toBe(0)
        expect(packsForAgents(3)).toBe(0)
        expect(packsForAgents(6)).toBe(1)
        expect(packsForAgents(20)).toBe(3)
    })
})

describe('rerunCreditTotalMicros', () => {
    it('measures against the budget plus the top-up left', () => {
        expect(rerunCreditTotalMicros({ rerun_budget_micros: 5_000_000, rerun_used_micros: 1_000_000, rerun_topup_micros: 2_000_000 })).toBe(7_000_000)
    })

    it('measures against what was spent when it went past the budget', () => {
        expect(rerunCreditTotalMicros({ rerun_budget_micros: 5_000_000, rerun_used_micros: 6_500_000, rerun_topup_micros: 1_000_000 })).toBe(7_500_000)
    })

    it('is zero when every column is empty', () => {
        expect(rerunCreditTotalMicros({ rerun_budget_micros: null, rerun_used_micros: null, rerun_topup_micros: null })).toBe(0)
        expect(rerunCreditTotalMicros(null)).toBe(0)
    })
})

describe('isModelAccess', () => {
    it('accepts only the known model access values', () => {
        expect(isModelAccess('best')).toBe(true)
        expect(isModelAccess('self_hosted')).toBe(true)
        expect(isModelAccess('pro')).toBe(false)
        expect(isModelAccess('')).toBe(false)
        expect(isModelAccess(null)).toBe(false)
    })
})

describe('planDiscountCents', () => {
    const legacyWithGiftedPack = { interval: 'monthly' as const, monthlyDiscountCents: 2500, agentPackDiscountCents: 1000 }

    it('keeps a legacy base price and a gifted pack when agents are added', () => {
        const quantities = { agent_pack: 4, credit_pack: 0, linkedin_slot: 0, whatsapp_slot: 0 }
        expect(planDiscountCents(legacyWithGiftedPack, quantities, 'monthly')).toBe(3500)
        expect(planPriceCents(quantities, 'monthly') - planDiscountCents(legacyWithGiftedPack, quantities, 'monthly')).toBe(5400)
    })

    it('takes off at most what the packs bill, and nothing once they are gone', () => {
        expect(planDiscountCents({ ...legacyWithGiftedPack, agentPackDiscountCents: 3000 }, { agent_pack: 1, credit_pack: 0, linkedin_slot: 0, whatsapp_slot: 0 }, 'monthly')).toBe(2500 + 1000)
        expect(planDiscountCents(legacyWithGiftedPack, { agent_pack: 0, credit_pack: 0, linkedin_slot: 0, whatsapp_slot: 0 }, 'monthly')).toBe(2500)
    })

    it('promises nothing past a change of interval', () => {
        expect(planDiscountCents(legacyWithGiftedPack, { agent_pack: 4, credit_pack: 0, linkedin_slot: 0, whatsapp_slot: 0 }, 'yearly')).toBe(0)
    })
})
