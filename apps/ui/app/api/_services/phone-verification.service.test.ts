import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeSupabase, writeMethodOf, type FakeSupabase } from '@/test/supabase-fake'

vi.mock('server-only', () => ({}))

const payloads = (client: FakeSupabase) => client.writes('user_phones').map(write => write.payload)

const sendVerification = vi.fn()
const checkVerification = vi.fn()
vi.mock('@/lib/sms/bird-verify', async importOriginal => ({
    ...(await importOriginal<object>()),
    sendVerification: (...args: unknown[]) => sendVerification(...args),
    checkVerification: (...args: unknown[]) => checkVerification(...args),
}))

let supabase = fakeSupabase()
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: () => supabase.client }))

const NOW = Date.parse('2026-10-06T12:00:00Z')
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString()

const row = (overrides: object = {}) => ({ user_id: 'user-1', phone: null, channel: null, verified_at: null, send_count: 0, send_window_started_at: null, last_sent_at: null, ...overrides })

const PHONE = '+33612345678'
const TAKEN = { owners: [{ user_id: 'someone-else' }] }

// A read filtered on the number asks who holds it; any other read is the row of the account.
const stored = (value: object | null, others: { owners?: object[]; placeholderHeld?: boolean; writeError?: object } = {}) => {
    supabase = fakeSupabase((table, calls) => {
        if (table === 'rpc:check_email_exists') return { data: others.placeholderHeld ?? false }
        if (table !== 'user_phones') return undefined
        if (writeMethodOf(calls)) return { error: others.writeError ?? null }
        const asksForHolder = calls.some(call => call.method === 'eq' && call.args[0] === 'phone')
        return { data: asksForHolder ? (others.owners ?? []) : value }
    })
}

const { confirmPhoneVerification, skipPhoneVerification, startPhoneVerification } = await import('./phone-verification.service')

beforeEach(() => {
    vi.useFakeTimers({ now: NOW })
    for (const mock of [sendVerification, checkVerification]) mock.mockReset()
    sendVerification.mockResolvedValue({ ok: true, channel: 'sms' })
})

describe('startPhoneVerification', () => {
    it('sends the code and counts the send', async () => {
        stored(row())

        expect(await startPhoneVerification('user-1', '+33612345678', 'sms', 'fr-BE')).toEqual({ ok: true, channel: 'sms' })

        expect(sendVerification).toHaveBeenCalledWith('+33612345678', 'sms', { language: 'fr-BE', previousChannel: null, lastSentAt: null, metadata: { context: 'wall', user_id: 'user-1' } })
        const stamp = new Date(NOW).toISOString()
        expect(payloads(supabase)).toEqual([{ phone: '+33612345678', channel: 'sms', send_count: 1, send_window_started_at: stamp, last_sent_at: stamp }])
    })

    it('refuses an account that owes no phone number', async () => {
        stored(null)
        expect(await startPhoneVerification('user-1', '+33612345678', 'sms')).toEqual({ ok: false, error: 'not_required' })

        stored(row({ verified_at: minutesAgo(5) }))
        expect(await startPhoneVerification('user-1', '+33612345678', 'sms')).toEqual({ ok: false, error: 'not_required' })

        expect(sendVerification).not.toHaveBeenCalled()
    })

    it('refuses a number another account already verified, before anything is sent or counted', async () => {
        stored(row(), TAKEN)

        expect(await startPhoneVerification('user-1', PHONE, 'sms')).toEqual({ ok: false, error: 'taken' })
        expect(sendVerification).not.toHaveBeenCalled()
        expect(payloads(supabase)).toEqual([])
    })

    it('refuses a number a phone-born account is still filed under, even without its phone row', async () => {
        stored(row(), { placeholderHeld: true })

        expect(await startPhoneVerification('user-1', PHONE, 'sms')).toEqual({ ok: false, error: 'taken' })
        expect(sendVerification).not.toHaveBeenCalled()
    })

    it('holds a second code to the same number back for a minute, and says how long is left', async () => {
        stored(row({ phone: PHONE, channel: 'sms', send_count: 1, send_window_started_at: minutesAgo(0.5), last_sent_at: minutesAgo(0.5) }))

        expect(await startPhoneVerification('user-1', PHONE, 'sms')).toEqual({ ok: false, error: 'too_soon', retryAfterSeconds: 30 })
        expect(sendVerification).not.toHaveBeenCalled()
    })

    it('moves a code to the other channel after 20 seconds, on the verification in progress', async () => {
        stored(row({ phone: PHONE, channel: 'whatsapp', send_count: 1, send_window_started_at: minutesAgo(0.25), last_sent_at: minutesAgo(0.25) }))
        expect(await startPhoneVerification('user-1', PHONE, 'sms')).toEqual({ ok: false, error: 'too_soon', retryAfterSeconds: 5 })

        stored(row({ phone: PHONE, channel: 'whatsapp', send_count: 1, send_window_started_at: minutesAgo(0.5), last_sent_at: minutesAgo(0.5) }))
        expect(await startPhoneVerification('user-1', PHONE, 'sms')).toEqual({ ok: true, channel: 'sms' })
        expect(sendVerification).toHaveBeenCalledWith(PHONE, 'sms', expect.objectContaining({ previousChannel: 'whatsapp', lastSentAt: minutesAgo(0.5) }))
    })

    it('keeps the channel the code really went by, when Bird kept it on the other one', async () => {
        stored(row({ phone: PHONE, channel: 'sms', send_count: 1, send_window_started_at: minutesAgo(2), last_sent_at: minutesAgo(2) }))
        sendVerification.mockResolvedValue({ ok: true, channel: 'sms' })

        expect(await startPhoneVerification('user-1', PHONE, 'whatsapp')).toEqual({ ok: true, channel: 'sms' })
        expect(payloads(supabase)).toEqual([expect.objectContaining({ send_count: 2, channel: 'whatsapp' }), { channel: 'sms' }])
    })

    it('relays the wait Bird asks for on a switch with nowhere to go, and gives the send back', async () => {
        const before = { phone: PHONE, channel: 'sms', send_count: 2, send_window_started_at: minutesAgo(30), last_sent_at: minutesAgo(0.5) }
        stored(row(before))
        sendVerification.mockResolvedValue({ ok: false, error: 'too_soon', retryAfterSeconds: 30 })

        expect(await startPhoneVerification('user-1', PHONE, 'whatsapp')).toEqual({ ok: false, error: 'too_soon', retryAfterSeconds: 30 })
        expect(payloads(supabase)[1]).toEqual(before)
    })

    it('sends to a corrected number at once, still counted in the hour', async () => {
        stored(row({ phone: '+33600000000', channel: 'sms', send_count: 2, send_window_started_at: minutesAgo(5), last_sent_at: minutesAgo(0.2) }))

        expect(await startPhoneVerification('user-1', PHONE, 'sms')).toEqual({ ok: true, channel: 'sms' })
        expect(sendVerification).toHaveBeenCalledWith(PHONE, 'sms', expect.objectContaining({ previousChannel: null }))
        expect(payloads(supabase)[0]).toMatchObject({ phone: PHONE, send_count: 3 })
    })

    it('stops at five codes an hour, and starts over once the hour has passed', async () => {
        stored(row({ send_count: 5, send_window_started_at: minutesAgo(30), last_sent_at: minutesAgo(2) }))
        expect(await startPhoneVerification('user-1', '+33612345678', 'sms')).toEqual({ ok: false, error: 'too_many', retryAfterSeconds: 30 * 60 })
        expect(sendVerification).not.toHaveBeenCalled()

        stored(row({ send_count: 5, send_window_started_at: minutesAgo(61), last_sent_at: minutesAgo(50) }))
        expect(await startPhoneVerification('user-1', '+33612345678', 'sms')).toEqual({ ok: true, channel: 'sms' })
        expect(payloads(supabase)[0]).toMatchObject({ send_count: 1, send_window_started_at: new Date(NOW).toISOString() })
    })

    it('gives the send back when nothing reached the phone', async () => {
        const before = { phone: '+33600000000', channel: 'whatsapp', send_count: 1, send_window_started_at: minutesAgo(10), last_sent_at: minutesAgo(10) }
        stored(row(before))
        sendVerification.mockResolvedValue({ ok: false, error: 'invalid_number' })

        expect(await startPhoneVerification('user-1', '+33612345678', 'sms')).toEqual({ ok: false, error: 'invalid_number' })
        expect(payloads(supabase)[1]).toEqual(before)
    })

    it('takes in a number of a country Bird refuses outright, without a code', async () => {
        stored(row())
        sendVerification.mockResolvedValue({ ok: false, error: 'unsupported_country' })

        expect(await startPhoneVerification('user-1', PHONE, 'sms')).toEqual({ ok: false, error: 'unsupported_country' })
        const stamp = new Date(NOW).toISOString()
        expect(payloads(supabase)[1]).toEqual({ skipped_at: stamp, phone: PHONE, unverifiable_at: stamp })
    })
})

describe('skipPhoneVerification', () => {
    it('lets the account in without a number, and leaves a verified one alone', async () => {
        stored(row())

        expect(await skipPhoneVerification('user-1')).toBe(true)
        const [skip] = supabase.writes('user_phones')
        expect(skip.payload).toEqual({ skipped_at: new Date(NOW).toISOString() })
        expect(skip.filters.map(call => [call.method, ...call.args])).toEqual([
            ['eq', 'user_id', 'user-1'],
            ['is', 'verified_at', null],
        ])
    })

    it('keeps a number no code reaches, and counts it done', async () => {
        stored(row())

        expect(await skipPhoneVerification('user-1', '+8613800138000')).toBe(true)
        const stamp = new Date(NOW).toISOString()
        expect(payloads(supabase)).toEqual([{ skipped_at: stamp, phone: '+8613800138000', unverifiable_at: stamp }])
    })
})

describe('confirmPhoneVerification', () => {
    it('stamps the number verified, and the consent with it, on the right code', async () => {
        stored(row({ phone: '+33612345678' }))
        checkVerification.mockResolvedValue({ ok: true })

        expect(await confirmPhoneVerification('user-1', '123456')).toEqual({ ok: true })

        expect(checkVerification).toHaveBeenCalledWith('+33612345678', '123456')
        const stamp = new Date(NOW).toISOString()
        expect(payloads(supabase)).toEqual([{ verified_at: stamp, contact_consent_at: stamp }])
    })

    it('writes nothing on a wrong code', async () => {
        stored(row({ phone: '+33612345678' }))
        checkVerification.mockResolvedValue({ ok: false, error: 'wrong_code' })

        expect(await confirmPhoneVerification('user-1', '000000')).toEqual({ ok: false, error: 'wrong_code' })
        expect(payloads(supabase)).toEqual([])
    })

    it('refuses a number taken while the code was on its way, without spending the code', async () => {
        stored(row({ phone: PHONE }), TAKEN)

        expect(await confirmPhoneVerification('user-1', '123456')).toEqual({ ok: false, error: 'taken' })
        expect(checkVerification).not.toHaveBeenCalled()
        expect(payloads(supabase)).toEqual([])
    })

    it('says the number is taken when another account verified it in the same instant', async () => {
        stored(row({ phone: PHONE }), { writeError: { code: '23505', message: 'duplicate key' } })
        checkVerification.mockResolvedValue({ ok: true })

        expect(await confirmPhoneVerification('user-1', '123456')).toEqual({ ok: false, error: 'taken' })
    })

    it('has nothing to check before a code was sent, nor for an account that owes nothing', async () => {
        stored(row())
        expect(await confirmPhoneVerification('user-1', '123456')).toEqual({ ok: false, error: 'expired' })

        stored(null)
        expect(await confirmPhoneVerification('user-1', '123456')).toEqual({ ok: false, error: 'not_required' })

        expect(checkVerification).not.toHaveBeenCalled()
    })
})
