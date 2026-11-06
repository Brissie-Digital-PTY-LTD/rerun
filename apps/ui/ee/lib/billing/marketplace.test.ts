import type Stripe from 'stripe'
import { describe, expect, it } from 'vitest'
import { isTemplateCheckoutSession, isTemplateSubscription, stripeTimestampIso, subscriptionPeriodEndIso } from './marketplace'

function subscription(fields: { metadata?: Record<string, string>; items?: { price: string | null; end?: number }[]; current_period_end?: number }): Stripe.Subscription {
    return {
        metadata: fields.metadata ?? {},
        items: { data: (fields.items ?? []).map(({ price, end }) => ({ price: price === null ? null : { id: price }, current_period_end: end })) },
        ...(fields.current_period_end ? { current_period_end: fields.current_period_end } : {}),
    } as unknown as Stripe.Subscription
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString()

describe('isTemplateSubscription', () => {
    it('trusts metadata.kind over the items', () => {
        expect(isTemplateSubscription(subscription({ metadata: { kind: 'template_purchase' }, items: [{ price: 'price_base' }] }))).toBe(true)
    })

    it('treats a subscription tagged with a plan as a plan whatever its items', () => {
        expect(isTemplateSubscription(subscription({ metadata: { plan: 'base' }, items: [{ price: 'price_template' }] }))).toBe(false)
    })

    it('does not call a subscription without items a template', () => {
        expect(isTemplateSubscription(subscription({}))).toBe(false)
    })

    it('calls a subscription whose items all sit off the plan a template', () => {
        expect(isTemplateSubscription(subscription({ items: [{ price: 'price_template_a' }, { price: 'price_template_b' }] }))).toBe(true)
    })

    it('keeps a subscription carrying any plan price out of the templates', () => {
        for (const planPrice of ['price_base', 'price_base_legacy', 'price_seat']) {
            expect(isTemplateSubscription(subscription({ items: [{ price: 'price_template' }, { price: planPrice }] }))).toBe(false)
        }
    })
})

describe('isTemplateCheckoutSession', () => {
    it('only recognises a session tagged as a template purchase', () => {
        expect(isTemplateCheckoutSession({ metadata: { kind: 'template_purchase' } } as unknown as Stripe.Checkout.Session)).toBe(true)
        expect(isTemplateCheckoutSession({ metadata: { kind: 'plan_card_setup' } } as unknown as Stripe.Checkout.Session)).toBe(false)
        expect(isTemplateCheckoutSession({ metadata: null } as unknown as Stripe.Checkout.Session)).toBe(false)
    })
})

describe('subscriptionPeriodEndIso', () => {
    it('prefers the base item end even when an add-on comes first', () => {
        const sub = subscription({ items: [{ price: 'price_seat', end: 2_000_000_000 }, { price: 'price_base', end: 1_900_000_000 }] })
        expect(subscriptionPeriodEndIso(sub)).toBe(iso(1_900_000_000))
    })

    it('falls back on the latest item end without a base item', () => {
        const sub = subscription({ items: [{ price: 'price_seat', end: 1_800_000_000 }, { price: 'price_template', end: 1_850_000_000 }, { price: 'price_x' }] })
        expect(subscriptionPeriodEndIso(sub)).toBe(iso(1_850_000_000))
    })

    it('falls back on the legacy top-level period end', () => {
        expect(subscriptionPeriodEndIso(subscription({ items: [{ price: 'price_base' }], current_period_end: 1_700_000_000 }))).toBe(iso(1_700_000_000))
    })

    it('is null when no period end exists anywhere', () => {
        expect(subscriptionPeriodEndIso(subscription({ items: [{ price: 'price_base' }] }))).toBeNull()
    })
})

describe('stripeTimestampIso', () => {
    it('converts Stripe seconds to an ISO string', () => {
        expect(stripeTimestampIso(1_700_000_000)).toBe('2023-11-14T22:13:20.000Z')
    })

    it('is null for a missing or zero timestamp', () => {
        expect(stripeTimestampIso(null)).toBeNull()
        expect(stripeTimestampIso(undefined)).toBeNull()
        expect(stripeTimestampIso(0)).toBeNull()
    })
})
