import type Stripe from 'stripe'
import { isBasePriceId, isPlanPriceId } from './stripe'

// Two kinds of subscription now live on the same Stripe customer: the workspace's Rerun plan, and
// any number of template subscriptions bought from the marketplace. They arrive through the same
// `customer.subscription.*` events, and `applySubscriptionToWorkspace` resolves its workspace by
// falling back to `stripe_customer_id` — so without this discriminator a template subscription
// would overwrite the workspace's own billing snapshot.

export const TEMPLATE_PURCHASE_KIND = 'template_purchase'

// Three layers, in order of trust. The metadata is written by our own checkout, so it is
// authoritative for anything created from now on; `metadata.plan` positively identifies a plan
// subscription created before this existed; and a subscription none of whose items sit on a plan
// price (base or add-on) cannot be a plan.
export function isTemplateSubscription(subscription: Stripe.Subscription): boolean {
    if (subscription.metadata?.kind === TEMPLATE_PURCHASE_KIND) return true
    if (subscription.metadata?.plan) return false

    const items = subscription.items?.data ?? []
    return items.length > 0 && !items.some(item => isPlanPriceId(item.price?.id))
}

export function isTemplateCheckoutSession(session: Stripe.Checkout.Session): boolean {
    return session.metadata?.kind === TEMPLATE_PURCHASE_KIND
}

// current_period_end moved from the subscription to its items in recent API versions. Shared with
// billing.service.ts rather than written twice: the fallback is the kind of detail that rots when
// it is duplicated. With add-ons, item[0] is not guaranteed to be the base item (a freshly added
// add-on can sit first), so prefer the base item and fall back to the latest item end.
export function subscriptionPeriodEndIso(subscription: Stripe.Subscription): string | null {
    const items = subscription.items?.data ?? []
    const baseEnd = items.find(item => isBasePriceId(item.price?.id))?.current_period_end
    const maxItemEnd = items.reduce<number | undefined>((max, item) => {
        const end = item.current_period_end
        return end && (!max || end > max) ? end : max
    }, undefined)
    const end = baseEnd ?? maxItemEnd ?? (subscription as unknown as { current_period_end?: number }).current_period_end
    return end ? new Date(end * 1000).toISOString() : null
}

export function stripeTimestampIso(seconds: number | null | undefined): string | null {
    return seconds ? new Date(seconds * 1000).toISOString() : null
}
