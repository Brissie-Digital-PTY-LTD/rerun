import { describe, expect, it, vi } from 'vitest'
import { checkoutRouteFor, trialOffer, type CheckoutRouteInput } from './checkout-variant'
import { trialArm } from './trial-experiment'

vi.mock('./trial-experiment', async importOriginal => {
    const actual = await importOriginal<typeof import('./trial-experiment')>()
    return { ...actual, trialArm: (id: number, share = 0.5) => actual.trialArm(id, share) }
})

const base: CheckoutRouteInput = { status: null, offer: 'paid', paused: false, hasPendingStart: false, trigger: null, hasStripePlan: false, hasPaymentMethod: false }

describe('checkoutRouteFor', () => {
    it('sends a paid plan to the plan dialog', () => {
        expect(checkoutRouteFor({ ...base, status: 'active', hasStripePlan: true })).toBeNull()
        expect(checkoutRouteFor({ ...base, status: 'past_due', hasStripePlan: true })).toBeNull()
    })

    it('sells a plan to a workspace entitled without a Stripe subscription', () => {
        expect(checkoutRouteFor({ ...base, status: 'active' })).toEqual({ variant: 'complimentary', payment: 'subscribe' })
    })

    it('reads a trial by its card', () => {
        expect(checkoutRouteFor({ ...base, status: 'trialing' })).toEqual({ variant: 'trial_cardless', payment: 'card_form' })
        expect(checkoutRouteFor({ ...base, status: 'trialing', hasPaymentMethod: true })).toEqual({ variant: 'trial_card', payment: 'card_on_file' })
    })

    it('explains the locked credit when the trial ran out of it', () => {
        expect(checkoutRouteFor({ ...base, status: 'trialing', trigger: 'budget_exhausted_trial' })).toEqual({ variant: 'credit_locked', payment: 'card_form' })
    })

    it('starts the trial through the card form', () => {
        expect(checkoutRouteFor({ ...base, offer: 'card_trial' })).toEqual({ variant: 'start_trial', payment: 'subscribe' })
        expect(checkoutRouteFor({ ...base, offer: 'cardless' })).toEqual({ variant: 'start_trial', payment: 'subscribe' })
    })

    it('restarts a paused workspace before anything else', () => {
        expect(checkoutRouteFor({ ...base, status: 'canceled', paused: true, offer: 'card_trial', hasPendingStart: true })).toEqual({ variant: 'paused', payment: 'subscribe' })
    })

    it('names what was parked once the trial is spent', () => {
        expect(checkoutRouteFor({ ...base, status: 'canceled', hasPendingStart: true })).toEqual({ variant: 'template', payment: 'subscribe' })
        expect(checkoutRouteFor({ ...base, status: 'canceled' })).toEqual({ variant: 'no_plan', payment: 'subscribe' })
    })
})

describe('trialOffer', () => {
    const ids = Array.from({ length: 100 }, (_, i) => i + 1)
    const cardId = ids.find(id => trialArm(id) === 'card')!
    const cardlessId = ids.find(id => trialArm(id) === 'cardless')!
    const fresh = { trial_ends_at: null, is_sandbox: false }

    it('follows the arm of the trial test for a workspace that never had one', () => {
        expect(trialOffer({ id: cardId, ...fresh })).toBe('card_trial')
        expect(trialOffer({ id: cardlessId, ...fresh })).toBe('cardless')
    })

    it('bills a spent trial and a sandbox today, whatever the arm', () => {
        expect(trialOffer({ id: cardlessId, trial_ends_at: '2026-09-20T00:00:00Z', is_sandbox: false })).toBe('paid')
        expect(trialOffer({ id: cardlessId, trial_ends_at: null, is_sandbox: true })).toBe('paid')
    })
})
