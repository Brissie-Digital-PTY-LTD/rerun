import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { markCreatorAccountDeauthorized, syncCreatorAccount } from '@/ee/services/connect.service'
import { signedStripeRequest, TEST_WEBHOOK_SECRET } from '@/ee/test/stripe-fake'
import { claimStripeEvent, markStripeEventProcessed, releaseStripeEvent } from '../idempotency'
import { POST } from './route'

vi.mock('@/ee/lib/billing/stripe', async importOriginal => ({
    ...(await importOriginal<typeof import('@/ee/lib/billing/stripe')>()),
    stripe: (await import('@/ee/test/stripe-fake')).fakeStripe(),
}))
vi.mock('@/ee/services/connect.service', () => ({ markCreatorAccountDeauthorized: vi.fn(), syncCreatorAccount: vi.fn() }))
vi.mock('../idempotency', async importOriginal => ({ ...(await importOriginal<typeof import('../idempotency')>()), claimStripeEvent: vi.fn(), markStripeEventProcessed: vi.fn(), releaseStripeEvent: vi.fn() }))

const URL = 'https://rerun.test/api/webhooks/stripe/connect'

function deliver(type: string, object: object, account?: string, secret = TEST_WEBHOOK_SECRET) {
    return POST(signedStripeRequest({ id: 'evt_c1', type, data: { object }, ...(account ? { account } : {}) }, { url: URL, secret }))
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('STRIPE_CONNECT_WEBHOOK_SECRET', TEST_WEBHOOK_SECRET)
    vi.mocked(claimStripeEvent).mockResolvedValue('claimed')
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('stripe connect webhook', () => {
    it('answers 500 when the connect secret is not configured', async () => {
        vi.stubEnv('STRIPE_CONNECT_WEBHOOK_SECRET', '')
        expect((await deliver('account.updated', { id: 'acct_1' })).status).toBe(500)
    })

    it('refuses a request without a stripe-signature header', async () => {
        const res = await POST(new Request(URL, { method: 'POST', body: '{}' }))
        expect(res.status).toBe(400)
    })

    it('refuses a request signed with the platform secret instead of the connect one', async () => {
        vi.stubEnv('STRIPE_CONNECT_WEBHOOK_SECRET', 'whsec_connect')
        const res = await deliver('account.updated', { id: 'acct_1' })
        expect(res.status).toBe(400)
        expect(syncCreatorAccount).not.toHaveBeenCalled()
    })

    it('drops a duplicate delivery', async () => {
        vi.mocked(claimStripeEvent).mockResolvedValue('processed')
        const res = await deliver('account.updated', { id: 'acct_1' })
        await expect(res.json()).resolves.toEqual({ received: true, duplicate: true })
        expect(syncCreatorAccount).not.toHaveBeenCalled()
    })

    it('syncs the creator account on account.updated', async () => {
        const res = await deliver('account.updated', { id: 'acct_1', charges_enabled: true })
        expect(res.status).toBe(200)
        expect(syncCreatorAccount).toHaveBeenCalledWith(expect.objectContaining({ id: 'acct_1' }))
        expect(markStripeEventProcessed).toHaveBeenCalledWith('evt_c1')
    })

    it('marks the account deauthorized by the account the event is about', async () => {
        await deliver('account.application.deauthorized', { id: 'ca_app' }, 'acct_9')
        expect(markCreatorAccountDeauthorized).toHaveBeenCalledWith('acct_9')
    })

    it('releases the claim and answers 500 when the handler throws', async () => {
        vi.mocked(syncCreatorAccount).mockRejectedValue(new Error('db down'))
        const res = await deliver('account.updated', { id: 'acct_1' })
        expect(res.status).toBe(500)
        expect(releaseStripeEvent).toHaveBeenCalledWith('evt_c1')
        expect(markStripeEventProcessed).not.toHaveBeenCalled()
    })
})
