import type Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { stripe } from '@/ee/lib/billing/stripe'
import { TRIAL_BLOCKED_CARD_REUSE } from '@/ee/lib/billing/trial-card'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { fakeSupabase, writeMethodOf, type FakeSupabase } from '@/test/supabase-fake'
import { reportTrialSkippedForCardReuse } from './billing-analytics.service'
import { checkoutPaymentMethodId, findWorkspaceId } from './billing.service'
import { enforceTrialCardClaim } from './trial-card.service'

vi.mock('@/ee/lib/billing/stripe', async importOriginal => ({ ...(await importOriginal<typeof import('@/ee/lib/billing/stripe')>()), stripe: (await import('@/ee/test/stripe-fake')).fakeStripe() }))
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('./billing.service', () => ({ findWorkspaceId: vi.fn(), checkoutPaymentMethodId: vi.fn() }))
vi.mock('./billing-analytics.service', () => ({ reportTrialSkippedForCardReuse: vi.fn() }))

const WORKSPACE_ID = 42

function subscription(overrides: Record<string, unknown> = {}): Stripe.Subscription {
    return { id: 'sub_1', status: 'trialing', customer: 'cus_1', metadata: { plan: 'base' }, items: { data: [] }, ...overrides } as unknown as Stripe.Subscription
}

let claims: { id: string; workspace_id: number | null; created_at: string }[]
let db: FakeSupabase

beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('TRIAL_CARD_REUSE_BLOCK', 'true')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    claims = [{ id: 'c1', workspace_id: WORKSPACE_ID, created_at: '2026-09-01T00:00:00Z' }]
    db = fakeSupabase((table, calls) => (table === 'trial_card_fingerprints' && !writeMethodOf(calls) ? { data: claims } : undefined))
    vi.mocked(createServiceRoleClient).mockReturnValue(db.client)
    vi.mocked(findWorkspaceId).mockResolvedValue(WORKSPACE_ID)
    vi.mocked(checkoutPaymentMethodId).mockResolvedValue('pm_1')
    vi.mocked(stripe.paymentMethods.retrieve).mockResolvedValue({ card: { fingerprint: 'fp_1' } } as never)
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(subscription() as never)
    vi.mocked(stripe.subscriptions.cancel).mockResolvedValue(subscription({ status: 'canceled' }) as never)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('enforceTrialCardClaim', () => {
    it('records the card and keeps the trial on a reused card while the block is off', async () => {
        vi.stubEnv('TRIAL_CARD_REUSE_BLOCK', '')
        claims.unshift({ id: 'c0', workspace_id: 7, created_at: '2026-08-01T00:00:00Z' })
        const sub = subscription()

        await expect(enforceTrialCardClaim(sub)).resolves.toBe(sub)

        expect(db.writes('trial_card_fingerprints').map(write => write.method)).toEqual(['upsert'])
        expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
        expect(db.writes('workspaces')).toEqual([])
    })

    it('lets a subscription that is not trialing through untouched', async () => {
        const sub = subscription({ status: 'active' })
        await expect(enforceTrialCardClaim(sub)).resolves.toBe(sub)
        expect(findWorkspaceId).not.toHaveBeenCalled()
    })

    it('lets a template subscription through untouched', async () => {
        const sub = subscription({ metadata: { kind: 'template_purchase' } })
        await expect(enforceTrialCardClaim(sub)).resolves.toBe(sub)
        expect(findWorkspaceId).not.toHaveBeenCalled()
    })

    it('lets the trial through when no workspace is found', async () => {
        vi.mocked(findWorkspaceId).mockResolvedValue(null)
        const sub = subscription()
        await expect(enforceTrialCardClaim(sub)).resolves.toBe(sub)
        expect(stripe.paymentMethods.retrieve).not.toHaveBeenCalled()
    })

    it('lets the trial through when there is no payment method', async () => {
        vi.mocked(checkoutPaymentMethodId).mockResolvedValue(null)
        const sub = subscription()
        await expect(enforceTrialCardClaim(sub)).resolves.toBe(sub)
        expect(stripe.paymentMethods.retrieve).not.toHaveBeenCalled()
    })

    it('lets the trial through when the card has no fingerprint', async () => {
        vi.mocked(stripe.paymentMethods.retrieve).mockResolvedValue({ card: null } as never)
        const sub = subscription()
        await expect(enforceTrialCardClaim(sub)).resolves.toBe(sub)
        expect(db.calls).toHaveLength(0)
    })

    it('records the card and keeps the trial when the workspace owns the first claim', async () => {
        claims.push({ id: 'c2', workspace_id: 7, created_at: '2026-09-02T00:00:00Z' })
        const sub = subscription()

        await expect(enforceTrialCardClaim(sub)).resolves.toBe(sub)

        expect(db.writes('trial_card_fingerprints')).toEqual([
            expect.objectContaining({
                method: 'upsert',
                payload: { fingerprint: 'fp_1', workspace_id: WORKSPACE_ID, stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', payment_method_id: 'pm_1' },
            }),
        ])
        expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
    })

    it('returns the current subscription without cancelling when it has left the trial since', async () => {
        claims.unshift({ id: 'c0', workspace_id: 7, created_at: '2026-08-01T00:00:00Z' })
        const current = subscription({ status: 'active' })
        vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(current as never)

        await expect(enforceTrialCardClaim(subscription())).resolves.toBe(current)
        expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
        expect(db.writes('workspaces')).toEqual([])
    })

    it('cancels a trial on a card another workspace already used and stamps the workspace', async () => {
        claims.unshift({ id: 'c0', workspace_id: 7, created_at: '2026-08-01T00:00:00Z' })

        await expect(enforceTrialCardClaim(subscription())).resolves.toBeNull()

        expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_1', { cancellation_details: { comment: TRIAL_BLOCKED_CARD_REUSE } }, { idempotencyKey: 'trial-card-block:sub_1' })
        const stamp = db.writes('trial_card_fingerprints').find(write => write.method === 'update')
        expect(stamp?.payload).toEqual({ trial_skipped_at: expect.any(String) })
        expect(stamp?.filters.map(call => call.args)).toEqual([
            ['fingerprint', 'fp_1'],
            ['workspace_id', WORKSPACE_ID],
        ])
        const [workspaceWrite] = db.writes('workspaces')
        expect(workspaceWrite.payload).toEqual({ trial_ends_at: expect.any(String) })
        expect(workspaceWrite.filters.map(call => call.args)).toEqual([['id', WORKSPACE_ID]])
        expect(reportTrialSkippedForCardReuse).toHaveBeenCalledWith(expect.objectContaining({ status: 'canceled' }), WORKSPACE_ID)
    })

    it('treats a claim left by a deleted workspace as spent', async () => {
        claims.unshift({ id: 'c0', workspace_id: null, created_at: '2026-08-01T00:00:00Z' })
        await expect(enforceTrialCardClaim(subscription())).resolves.toBeNull()
    })

    it('never rethrows and hands the subscription back when Stripe fails', async () => {
        vi.mocked(stripe.paymentMethods.retrieve).mockRejectedValue(new Error('stripe down'))
        const sub = subscription()
        await expect(enforceTrialCardClaim(sub)).resolves.toBe(sub)
    })

    it('never rethrows when the cancellation itself fails', async () => {
        claims.unshift({ id: 'c0', workspace_id: 7, created_at: '2026-08-01T00:00:00Z' })
        vi.mocked(stripe.subscriptions.cancel).mockRejectedValue(new Error('already canceled'))
        const sub = subscription()
        await expect(enforceTrialCardClaim(sub)).resolves.toBe(sub)
        expect(db.writes('workspaces')).toEqual([])
    })
})
