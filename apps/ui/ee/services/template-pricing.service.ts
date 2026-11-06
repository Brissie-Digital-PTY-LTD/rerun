import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/app/api/database.types'
import { TAX_BEHAVIOR } from '@/ee/lib/billing/plans'
import { stripe } from '@/ee/lib/billing/stripe'
import { selectMaybeSingle } from '@/supabase/supabase-helpers'

// The platform is the merchant of record, so the Product and the Price live on the platform account
// and the connected account only ever receives a transfer. Nothing here passes a `{ stripeAccount }`
// request option, and that is on purpose.
//
// Provisioning runs at approval rather than on every save: the price is part of what we review, and
// syncing on each autosave would litter the Stripe catalogue with dead Price objects.

type TemplateUpdate = Database['public']['Tables']['templates']['Update']

// Template prices follow the plan: the creator's figure is the pre-tax base, and Stripe adds the
// buyer's local tax on top of it. That keeps the creator's earnings a single number they can be
// quoted up front, instead of one that moves with each buyer's country.
//
// The classification Stripe needs to pick a rate comes from the account's preset product tax code
// (Dashboard > Tax > Settings), which also covers the products minted here at approval time.

const PRICING_COLUMNS = [
    'id',
    'slug',
    'title',
    'tagline',
    'creator_id',
    'pricing_model',
    'price_amount_cents',
    'price_currency',
    'stripe_product_id',
    'stripe_price_id',
] as const

export async function syncTemplateStripePrice(supabase: SupabaseClient<Database>, templateId: string): Promise<void> {
    const { data: template } = await selectMaybeSingle(supabase, 'templates', PRICING_COLUMNS, { id: templateId })
    if (!template) throw new Error('Template not found')

    const productId = await ensureProduct(template)

    if (template.pricing_model === 'free') {
        if (template.stripe_price_id) await stripe.prices.update(template.stripe_price_id, { active: false })
        await write(supabase, templateId, { stripe_product_id: productId, stripe_price_id: null })
        return
    }

    if (template.stripe_price_id && (await priceMatches(template.stripe_price_id, template))) {
        await write(supabase, templateId, { stripe_product_id: productId })
        return
    }

    // Stripe prices are immutable, so a change mints a new one. Subscribers stay on the price they
    // signed up for until they cancel and buy again, which is the grandfathering the creator UI
    // announces.
    const price = await stripe.prices.create({
        product: productId,
        unit_amount: template.price_amount_cents,
        currency: template.price_currency,
        tax_behavior: TAX_BEHAVIOR,
        ...(template.pricing_model === 'recurring' ? { recurring: { interval: 'month' as const } } : {}),
        metadata: { template_id: template.id, template_slug: template.slug },
    })

    if (template.stripe_price_id) await stripe.prices.update(template.stripe_price_id, { active: false })
    await write(supabase, templateId, { stripe_product_id: productId, stripe_price_id: price.id })
}

type PricingRow = Pick<Database['public']['Tables']['templates']['Row'], (typeof PRICING_COLUMNS)[number]>

async function ensureProduct(template: PricingRow): Promise<string> {
    if (template.stripe_product_id) {
        await stripe.products.update(template.stripe_product_id, { name: template.title, description: template.tagline || undefined })
        return template.stripe_product_id
    }

    const product = await stripe.products.create({
        name: template.title,
        description: template.tagline || undefined,
        metadata: { template_id: template.id, template_slug: template.slug, creator_id: template.creator_id ?? '' },
    })
    return product.id
}

async function priceMatches(priceId: string, template: PricingRow): Promise<boolean> {
    try {
        const price = await stripe.prices.retrieve(priceId)
        const wantsRecurring = template.pricing_model === 'recurring'
        return (
            price.active &&
            price.unit_amount === template.price_amount_cents &&
            price.currency === template.price_currency &&
            (price.recurring?.interval === 'month') === wantsRecurring &&
            // A price left on `unspecified` makes `automatic_tax` fail the whole checkout, and Stripe
            // only lets that field be set once, so a stale one is re-minted rather than patched.
            price.tax_behavior === TAX_BEHAVIOR
        )
    } catch {
        return false
    }
}

async function write(supabase: SupabaseClient<Database>, templateId: string, patch: TemplateUpdate): Promise<void> {
    const { error } = await supabase
        .from('templates')
        .update<TemplateUpdate>({ ...patch, price_synced_at: new Date().toISOString() })
        .eq('id', templateId)
    if (error) throw new Error(`Failed to persist the Stripe price: ${error.message}`)
}
