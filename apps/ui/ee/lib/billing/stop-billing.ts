import { stripe } from '@/ee/lib/billing/stripe'

const SETTLED_SUBSCRIPTION_STATUSES = new Set(['canceled', 'incomplete_expired'])

/**
 * Stops Stripe from charging for a trial that is being paused. A declined first charge leaves a
 * `past_due` subscription that Stripe keeps retrying for weeks, and cancelling it is not enough: its
 * open invoice stays collectable until it is voided. Coming back is a new subscription, through
 * the billing dialog. Reached for a customer with no paid invoice, and for one whose account is
 * being deleted once nothing is left to renew.
 */
export async function stopBilling(customerId: string | null): Promise<string | null> {
    if (!customerId) return null
    try {
        const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 })
        for (const subscription of subscriptions.data) {
            if (SETTLED_SUBSCRIPTION_STATUSES.has(subscription.status)) continue
            await stripe.subscriptions.cancel(subscription.id, { invoice_now: false, prorate: false })
        }
        const invoices = await stripe.invoices.list({ customer: customerId, status: 'open', limit: 20 })
        for (const invoice of invoices.data) {
            if (invoice.id) await stripe.invoices.voidInvoice(invoice.id)
        }
        return null
    } catch (err) {
        return err instanceof Error ? err.message : String(err)
    }
}
