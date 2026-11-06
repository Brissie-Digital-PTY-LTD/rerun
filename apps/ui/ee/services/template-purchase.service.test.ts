import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { stripe } from '@/ee/lib/billing/stripe'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { fakeSupabase, writeMethodOf, type FakeSupabase, type SupabaseResult } from '@/test/supabase-fake'
import { requestTemplateRevocation } from '@/ee/trigger/revoke-template-access'
import { reverseCreatorTransfer, transferSaleToCreator } from './creator-payout.service'
import { reenableAgentsForTemplate, revokeTemplateAccess } from './template-revocation.service'
import { applyTemplateSubscription, recordTemplatePurchase, recordTemplateRenewal, refundTemplatePurchase } from './template-purchase.service'

vi.mock('@/ee/lib/billing/stripe', async importOriginal => ({ ...(await importOriginal<typeof import('@/ee/lib/billing/stripe')>()), stripe: (await import('@/ee/test/stripe-fake')).fakeStripe() }))
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/ee/trigger/revoke-template-access', () => ({ requestTemplateRevocation: vi.fn() }))
vi.mock('./creator-payout.service', () => ({ transferSaleToCreator: vi.fn(), reverseCreatorTransfer: vi.fn() }))
vi.mock('./template-revocation.service', () => ({ reenableAgentsForTemplate: vi.fn(), revokeTemplateAccess: vi.fn() }))

const METADATA = { kind: 'template_purchase', workspace_id: '42', template_id: 'tpl_1', template_slug: 'seo-team', creator_id: 'creator_1', connected_account_id: 'acct_1' }
const SPLIT = { taxCents: 100, feeCents: 75, netCents: 725, transferId: 'tr_1' }

type Responses = { purchaseWrite?: SupabaseResult; saleWrite?: SupabaseResult; purchase?: unknown; sale?: unknown; refunds?: unknown[]; template?: unknown }
let responses: Responses
let db: FakeSupabase

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    responses = { template: { slug: 'seo-team', title: 'SEO team' } }
    db = fakeSupabase((table, calls) => {
        const write = writeMethodOf(calls)
        if (table === 'template_purchases') return write ? responses.purchaseWrite : { data: responses.purchase ?? null }
        if (table === 'template_sales') {
            if (write) return responses.saleWrite
            return calls.some(call => call.method === 'like') ? { data: responses.refunds ?? [] } : { data: responses.sale ?? null }
        }
        if (table === 'templates') return { data: responses.template ?? null }
        return undefined
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(db.client)
    vi.mocked(transferSaleToCreator).mockResolvedValue(SPLIT)
})

function session(overrides: Record<string, unknown> = {}): Stripe.Checkout.Session {
    return {
        id: 'cs_1',
        mode: 'payment',
        payment_status: 'paid',
        metadata: METADATA,
        client_reference_id: 'user_1',
        amount_total: 1000,
        currency: 'usd',
        payment_intent: 'pi_1',
        subscription: null,
        total_details: { amount_tax: 100 },
        created: 1_780_000_000,
        ...overrides,
    } as unknown as Stripe.Checkout.Session
}

function templateSubscription(overrides: Record<string, unknown> = {}): Stripe.Subscription {
    return {
        id: 'sub_tpl',
        status: 'active',
        metadata: METADATA,
        cancel_at_period_end: false,
        items: { data: [{ price: { id: 'price_tpl', unit_amount: 900, currency: 'eur' }, quantity: 2, current_period_end: 1_780_000_000 }] },
        ...overrides,
    } as unknown as Stripe.Subscription
}

describe('recordTemplatePurchase', () => {
    it('ignores a session that is not a template purchase', async () => {
        await recordTemplatePurchase(session({ metadata: { kind: 'plan_card_setup', workspace_id: '42' } }))
        expect(db.calls).toHaveLength(0)
    })

    it('grants nothing for a session that is not paid yet', async () => {
        await recordTemplatePurchase(session({ status: 'complete', payment_status: 'unpaid' }))
        expect(db.calls).toHaveLength(0)
        expect(reenableAgentsForTemplate).not.toHaveBeenCalled()
        expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled()
        expect(transferSaleToCreator).not.toHaveBeenCalled()
    })

    it('ignores a session whose workspace id is not a number', async () => {
        await recordTemplatePurchase(session({ metadata: { ...METADATA, workspace_id: 'nope' } }))
        expect(db.calls).toHaveLength(0)
    })

    it('records a subscription purchase without writing its own sale line', async () => {
        await recordTemplatePurchase(session({ mode: 'subscription', payment_intent: null, subscription: { id: 'sub_tpl' } }))

        const [upsert] = db.writes('template_purchases')
        expect(upsert.method).toBe('upsert')
        expect(upsert.payload).toMatchObject({ workspace_id: 42, template_id: 'tpl_1', pricing_model: 'recurring', status: 'active', stripe_subscription_id: 'sub_tpl', stripe_payment_intent_id: null, revoked_at: null })
        expect(db.chainsOn('template_purchases')[0].find(call => call.method === 'upsert')?.args[1]).toEqual({ onConflict: 'workspace_id,template_id' })
        expect(reenableAgentsForTemplate).toHaveBeenCalledWith(42, 'tpl_1')
        expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled()
        expect(db.writes('template_sales')).toEqual([])
    })

    it('transfers a one-off sale to the creator and writes its ledger line', async () => {
        vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({ latest_charge: 'ch_1', amount_received: 1000 } as never)

        await recordTemplatePurchase(session())

        expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_1')
        expect(transferSaleToCreator).toHaveBeenCalledWith({
            chargeId: 'ch_1',
            connectedAccountId: 'acct_1',
            grossCents: 1000,
            taxCents: 100,
            currency: 'usd',
            metadata: { kind: 'template_purchase', workspace_id: '42', template_id: 'tpl_1', template_slug: 'seo-team', creator_id: 'creator_1' },
        })
        expect(db.writes('template_sales')[0].payload).toEqual({
            template_id: 'tpl_1',
            template_slug: 'seo-team',
            template_title: 'SEO team',
            creator_id: 'creator_1',
            workspace_id: 42,
            purchase_id: null,
            kind: 'one_time',
            gross_cents: 1000,
            tax_cents: 100,
            application_fee_cents: 75,
            net_cents: 725,
            currency: 'usd',
            stripe_charge_id: 'ch_1',
            stripe_invoice_id: null,
            stripe_transfer_id: 'tr_1',
            stripe_connected_account_id: 'acct_1',
            occurred_at: new Date(1_780_000_000 * 1000).toISOString(),
        })
    })

    it('throws when the purchase row cannot be written', async () => {
        responses.purchaseWrite = { error: { message: 'boom' } }
        await expect(recordTemplatePurchase(session())).rejects.toThrow('Failed to record the purchase: boom')
        expect(reenableAgentsForTemplate).not.toHaveBeenCalled()
    })

    it('treats a duplicate sale line as a replay', async () => {
        vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({ latest_charge: 'ch_1' } as never)
        responses.saleWrite = { error: { code: '23505', message: 'duplicate key' } }
        await expect(recordTemplatePurchase(session())).resolves.toBeUndefined()
    })

    it('throws on any other ledger failure', async () => {
        vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({ latest_charge: 'ch_1' } as never)
        responses.saleWrite = { error: { code: '42P01', message: 'no table' } }
        await expect(recordTemplatePurchase(session())).rejects.toThrow('Failed to record the sale: no table')
    })
})

describe('applyTemplateSubscription', () => {
    it.each([
        ['active', 'active'],
        ['trialing', 'active'],
        ['past_due', 'past_due'],
        ['unpaid', 'past_due'],
        ['canceled', 'canceled'],
        ['incomplete_expired', 'canceled'],
    ])('maps a %s subscription to a %s purchase', async (stripeStatus, purchaseStatus) => {
        await applyTemplateSubscription(templateSubscription({ status: stripeStatus }))
        expect(db.writes('template_purchases')[0].payload).toMatchObject({ status: purchaseStatus })
    })

    it('re-enables the agents and stamps the activation only while active', async () => {
        await applyTemplateSubscription(templateSubscription({ status: 'active' }))
        expect(db.writes('template_purchases')[0].payload).toMatchObject({ activated_at: expect.any(String), revoked_at: null })
        expect(reenableAgentsForTemplate).toHaveBeenCalledWith(42, 'tpl_1')
    })

    it('leaves the agents and the activation alone on a lapsed subscription', async () => {
        await applyTemplateSubscription(templateSubscription({ status: 'past_due' }))
        expect(db.writes('template_purchases')[0].payload).not.toHaveProperty('activated_at')
        expect(db.writes('template_purchases')[0].payload).not.toHaveProperty('revoked_at')
        expect(reenableAgentsForTemplate).not.toHaveBeenCalled()
    })

    it('prices the purchase at the unit amount times the quantity', async () => {
        await applyTemplateSubscription(templateSubscription({ cancel_at_period_end: true }))
        expect(db.writes('template_purchases')[0].payload).toMatchObject({
            amount_cents: 1800,
            currency: 'eur',
            stripe_price_id: 'price_tpl',
            pricing_model: 'recurring',
            cancel_at_period_end: true,
            current_period_end: new Date(1_780_000_000 * 1000).toISOString(),
        })
    })

    it('ignores a plan subscription', async () => {
        await applyTemplateSubscription(templateSubscription({ metadata: { plan: 'base' } }))
        expect(db.calls).toHaveLength(0)
    })

    it('throws when the purchase row cannot be written', async () => {
        responses.purchaseWrite = { error: { message: 'boom' } }
        await expect(applyTemplateSubscription(templateSubscription())).rejects.toThrow('Failed to sync the template subscription: boom')
    })
})

describe('recordTemplateRenewal', () => {
    function invoice(overrides: Record<string, unknown> = {}): Stripe.Invoice {
        return {
            id: 'in_1',
            amount_paid: 1000,
            currency: 'usd',
            total_taxes: [{ amount: 60 }, { amount: 40 }],
            created: 1_780_000_000,
            parent: { subscription_details: { subscription: 'sub_tpl' } },
            charge: 'ch_legacy',
            ...overrides,
        } as unknown as Stripe.Invoice
    }

    beforeEach(() => {
        vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(templateSubscription() as never)
        responses.purchase = { id: 'pur_1' }
    })

    it('reads the subscription off the invoice parent', async () => {
        await recordTemplateRenewal(invoice())
        expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_tpl')
    })

    it('falls back to the legacy subscription field', async () => {
        await recordTemplateRenewal(invoice({ parent: null, subscription: { id: 'sub_legacy' } }))
        expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_legacy')
    })

    it('does nothing for an invoice without a subscription', async () => {
        await recordTemplateRenewal(invoice({ parent: null }))
        expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled()
        expect(db.calls).toHaveLength(0)
    })

    it('does nothing for a plan subscription invoice', async () => {
        vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(templateSubscription({ metadata: { plan: 'base' } }) as never)
        await recordTemplateRenewal(invoice())
        expect(transferSaleToCreator).not.toHaveBeenCalled()
    })

    it('writes a recurring line linked to the purchase, with the summed taxes and the legacy charge', async () => {
        await recordTemplateRenewal(invoice())

        expect(transferSaleToCreator).toHaveBeenCalledWith(expect.objectContaining({ chargeId: 'ch_legacy', grossCents: 1000, taxCents: 100 }))
        expect(stripe.invoicePayments.list).not.toHaveBeenCalled()
        expect(db.writes('template_sales')[0].payload).toMatchObject({ kind: 'recurring', purchase_id: 'pur_1', stripe_invoice_id: 'in_1', stripe_charge_id: 'ch_legacy', stripe_transfer_id: 'tr_1' })
    })

    it('reads the charge off the expanded invoice payments', async () => {
        await recordTemplateRenewal(invoice({ charge: undefined, payments: { data: [{ payment: { charge: 'ch_expanded' } }] } }))
        expect(transferSaleToCreator).toHaveBeenCalledWith(expect.objectContaining({ chargeId: 'ch_expanded' }))
        expect(stripe.invoicePayments.list).not.toHaveBeenCalled()
    })

    it('lists the invoice payments and follows the payment intent to its charge', async () => {
        vi.mocked(stripe.invoicePayments.list).mockResolvedValue({ data: [{ payment: { payment_intent: 'pi_9' } }] } as never)
        vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({ latest_charge: { id: 'ch_from_intent' } } as never)

        await recordTemplateRenewal(invoice({ charge: undefined }))

        expect(stripe.invoicePayments.list).toHaveBeenCalledWith({ invoice: 'in_1', limit: 3 })
        expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_9')
        expect(transferSaleToCreator).toHaveBeenCalledWith(expect.objectContaining({ chargeId: 'ch_from_intent' }))
    })

    it('records the line without a charge when none can be found', async () => {
        vi.mocked(stripe.invoicePayments.list).mockResolvedValue({ data: [{ payment: {} }] } as never)
        responses.purchase = null

        await recordTemplateRenewal(invoice({ charge: undefined }))

        expect(transferSaleToCreator).toHaveBeenCalledWith(expect.objectContaining({ chargeId: null }))
        expect(db.writes('template_sales')[0].payload).toMatchObject({ stripe_charge_id: null, purchase_id: null })
    })
})

describe('refundTemplatePurchase', () => {
    const SALE_LINE = {
        workspace_id: 42,
        template_id: 'tpl_1',
        template_slug: 'seo-team',
        creator_id: 'creator_1',
        stripe_connected_account_id: 'acct_1',
        gross_cents: 1000,
        tax_cents: 100,
        application_fee_cents: 80,
        net_cents: 820,
        stripe_transfer_id: 'tr_1',
    }

    function charge(overrides: Record<string, unknown> = {}): Stripe.Charge {
        return { id: 'ch_1', amount: 1000, amount_refunded: 1000, currency: 'usd', metadata: METADATA, ...overrides } as unknown as Stripe.Charge
    }

    it('does nothing when nothing was refunded', async () => {
        await refundTemplatePurchase(charge({ amount_refunded: 0 }))
        expect(db.calls).toHaveLength(0)
    })

    it('does nothing for a charge that is neither ours nor in the ledger', async () => {
        await refundTemplatePurchase(charge({ metadata: {} }))
        expect(db.writes('template_sales')).toEqual([])
        expect(revokeTemplateAccess).not.toHaveBeenCalled()
    })

    it('reverses the transfer, writes a negative line and revokes on a full refund', async () => {
        responses.sale = SALE_LINE

        await refundTemplatePurchase(charge())

        expect(reverseCreatorTransfer).toHaveBeenCalledWith('tr_1', 1000, 1000)
        expect(db.writes('template_sales')[0].payload).toMatchObject({
            kind: 'refund',
            gross_cents: -1000,
            tax_cents: -100,
            application_fee_cents: -80,
            net_cents: -820,
            stripe_charge_id: 'ch_1_refund',
            stripe_transfer_id: 'tr_1',
        })
        expect(revokeTemplateAccess).toHaveBeenCalledWith(42, 'tpl_1', 'refunded')
        expect(requestTemplateRevocation).toHaveBeenCalledWith({ workspaceId: 42, templateId: 'tpl_1' })
    })

    it('mirrors a proportional share of the line and keeps the template on a partial refund', async () => {
        responses.sale = SALE_LINE

        await refundTemplatePurchase(charge({ amount_refunded: 500 }))

        expect(reverseCreatorTransfer).toHaveBeenCalledWith('tr_1', 500, 1000)
        expect(db.writes('template_sales')[0].payload).toMatchObject({ gross_cents: -500, tax_cents: -50, application_fee_cents: -40, net_cents: -410 })
        expect(revokeTemplateAccess).not.toHaveBeenCalled()
        expect(requestTemplateRevocation).not.toHaveBeenCalled()
    })

    it('finds the template through the ledger line when the renewal charge carries no metadata', async () => {
        responses.sale = { ...SALE_LINE, workspace_id: 7, template_id: 'tpl_2' }

        await refundTemplatePurchase(charge({ metadata: {} }))

        expect(db.writes('template_sales')[0].payload).toMatchObject({ workspace_id: 7, template_id: 'tpl_2' })
        expect(revokeTemplateAccess).toHaveBeenCalledWith(7, 'tpl_2', 'refunded')
    })

    it('still records the refund and revokes when the transfer reversal fails', async () => {
        responses.sale = SALE_LINE
        vi.mocked(reverseCreatorTransfer).mockRejectedValue(new Error('balance insufficient'))

        await expect(refundTemplatePurchase(charge())).resolves.toBeUndefined()

        expect(db.writes('template_sales')).toHaveLength(1)
        expect(revokeTemplateAccess).toHaveBeenCalled()
    })

    it('records a second partial refund on the same charge as its own negative line, for what the first did not cover', async () => {
        responses.sale = SALE_LINE
        responses.refunds = [{ gross_cents: -300, tax_cents: -30, application_fee_cents: -24, net_cents: -246 }]

        await refundTemplatePurchase(charge({ amount_refunded: 500 }))

        expect(db.writes('template_sales')[0].payload).toMatchObject({ kind: 'refund', gross_cents: -200, tax_cents: -20, application_fee_cents: -16, net_cents: -164, stripe_charge_id: 'ch_1_refund_500' })
        expect(revokeTemplateAccess).not.toHaveBeenCalled()
    })

    it('writes nothing more for a refund already covered by the recorded lines', async () => {
        responses.sale = SALE_LINE
        responses.refunds = [{ gross_cents: -500, tax_cents: -50, application_fee_cents: -40, net_cents: -410 }]

        await refundTemplatePurchase(charge({ amount_refunded: 300 }))

        expect(db.writes('template_sales')).toEqual([])
    })

    it('closes a full refund made in two steps with the exact remainder, and revokes', async () => {
        responses.sale = { ...SALE_LINE, tax_cents: 99, application_fee_cents: 81, net_cents: 820 }
        responses.refunds = [{ gross_cents: -333, tax_cents: -33, application_fee_cents: -27, net_cents: -273 }]

        await refundTemplatePurchase(charge({ amount_refunded: 1000 }))

        expect(db.writes('template_sales')[0].payload).toMatchObject({ gross_cents: -667, tax_cents: -66, application_fee_cents: -54, net_cents: -547 })
        expect(revokeTemplateAccess).toHaveBeenCalledWith(42, 'tpl_1', 'refunded')
    })

    it('recomputes the split from the refund when there is no ledger line to mirror', async () => {
        await refundTemplatePurchase(charge())

        expect(reverseCreatorTransfer).not.toHaveBeenCalled()
        expect(db.writes('template_sales')[0].payload).toMatchObject({ gross_cents: -1000, tax_cents: 0, application_fee_cents: -80, net_cents: -920, stripe_transfer_id: null })
    })
})
