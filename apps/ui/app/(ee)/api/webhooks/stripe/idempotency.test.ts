import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { fakeSupabase, writeMethodOf, type SupabaseResult } from '@/test/supabase-fake'
import { claimStripeEvent, markStripeEventProcessed, releaseStripeEvent, unclaimedResponse } from './idempotency'

vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))

const event = { id: 'evt_1', type: 'invoice.paid', account: undefined } as unknown as Stripe.Event

const NOW = new Date('2026-11-05T12:00:00.000Z')
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString()

function db({ insert, read, update }: { insert?: SupabaseResult; read?: SupabaseResult; update?: SupabaseResult } = {}) {
    const fake = fakeSupabase((_table, calls) => {
        const write = writeMethodOf(calls)
        if (write === 'insert') return insert
        if (write === 'update') return update
        return write ? undefined : read
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client)
    return fake
}

const duplicateKey = { error: { code: '23505', message: 'duplicate key' } }

describe('claimStripeEvent', () => {
    beforeEach(() => vi.mocked(createServiceRoleClient).mockReset())

    it('claims an event seen for the first time', async () => {
        const fake = db()
        await expect(claimStripeEvent(event, NOW)).resolves.toBe('claimed')
        expect(fake.writes('stripe_events')).toEqual([{ method: 'insert', payload: { id: 'evt_1', type: 'invoice.paid', connected_account_id: null, claimed_at: NOW.toISOString() }, filters: [] }])
    })

    it('records the connected account an event is about', async () => {
        const fake = db()
        await claimStripeEvent({ ...event, account: 'acct_1' } as Stripe.Event, NOW)
        expect(fake.writes('stripe_events')[0].payload).toMatchObject({ connected_account_id: 'acct_1' })
    })

    it('drops a duplicate of an event already processed', async () => {
        db({ insert: duplicateKey, read: { data: { processed_at: '2026-09-30T10:00:00Z', claimed_at: minutesAgo(60) } } })
        await expect(claimStripeEvent(event, NOW)).resolves.toBe('processed')
    })

    it('leaves to the running delivery an event claimed moments ago', async () => {
        const fake = db({ insert: duplicateKey, read: { data: { processed_at: null, claimed_at: minutesAgo(1) } } })
        await expect(claimStripeEvent(event, NOW)).resolves.toBe('in_flight')
        expect(fake.writes('stripe_events').filter(write => write.method === 'update')).toEqual([])
    })

    it('takes over the claim of a delivery that died without releasing it', async () => {
        const claimedAt = minutesAgo(10)
        const fake = db({ insert: duplicateKey, read: { data: { processed_at: null, claimed_at: claimedAt } }, update: { data: [{ id: 'evt_1' }] } })
        await expect(claimStripeEvent(event, NOW)).resolves.toBe('claimed')
        const takeover = fake.writes('stripe_events').find(write => write.method === 'update')
        expect(takeover?.payload).toEqual({ claimed_at: NOW.toISOString() })
        expect(takeover?.filters.map(call => [call.method, ...call.args])).toEqual(expect.arrayContaining([['eq', 'id', 'evt_1'], ['eq', 'claimed_at', claimedAt], ['is', 'processed_at', null]]))
    })

    it('lets only one of two concurrent deliveries take over a stale claim', async () => {
        db({ insert: duplicateKey, read: { data: { processed_at: null, claimed_at: minutesAgo(10) } }, update: { data: [] } })
        await expect(claimStripeEvent(event, NOW)).resolves.toBe('in_flight')
    })

    it('runs the handler when the insert failed and no row exists', async () => {
        db({ insert: { error: { message: 'network' } }, read: { data: null } })
        await expect(claimStripeEvent(event, NOW)).resolves.toBe('claimed')
    })
})

describe('unclaimedResponse', () => {
    it('acknowledges a processed duplicate and asks Stripe to retry one still in flight', async () => {
        expect(unclaimedResponse('processed').status).toBe(200)
        await expect(unclaimedResponse('processed').json()).resolves.toEqual({ received: true, duplicate: true })
        expect(unclaimedResponse('in_flight').status).toBe(409)
    })
})

describe('markStripeEventProcessed', () => {
    it('stamps processed_at on the event row', async () => {
        const fake = db()
        await markStripeEventProcessed('evt_1')
        const [write] = fake.writes('stripe_events')
        expect(write.method).toBe('update')
        expect(write.payload).toEqual({ processed_at: expect.any(String) })
        expect(write.filters).toEqual([{ table: 'stripe_events', method: 'eq', args: ['id', 'evt_1'] }])
    })
})

describe('releaseStripeEvent', () => {
    it('deletes the claim so the retry runs', async () => {
        const fake = db()
        await releaseStripeEvent('evt_1')
        expect(fake.writes('stripe_events')).toEqual([{ method: 'delete', payload: undefined, filters: [{ table: 'stripe_events', method: 'eq', args: ['id', 'evt_1'] }] }])
    })
})
