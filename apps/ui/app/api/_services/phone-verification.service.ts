import 'server-only'
import type { Database } from '@/app/api/database.types'
import { phoneStandingFor, UNIQUE_VIOLATION } from '@/app/api/_services/phone-ownership.service'
import { isVerificationChannel, type VerificationChannel } from '@/lib/phone/verification'
import { BIRD_RESEND_COOLDOWN_MS, checkVerification, sendVerification, type VerificationFailure } from '@/lib/sms/bird-verify'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectMaybeSingle } from '@/supabase/supabase-helpers'
import type { SupabaseClient } from '@supabase/supabase-js'

// Bird holds a resend on the same verification for this long, so a code asked for sooner would
// not leave anyway.
export const MIN_RESEND_INTERVAL_MS = BIRD_RESEND_COOLDOWN_MS
// Moving to the other channel is the answer to a code that never came: it waits less than a resend.
export const MIN_SWITCH_INTERVAL_MS = 20_000
export const SEND_WINDOW_MS = 60 * 60_000
export const MAX_SENDS_PER_WINDOW = 5

const USER_PHONE_COLUMNS = ['user_id', 'phone', 'channel', 'verified_at', 'send_count', 'send_window_started_at', 'last_sent_at'] as const

type UserPhoneUpdate = Database['public']['Tables']['user_phones']['Update']

export type PhoneVerificationFailure = VerificationFailure | 'not_required' | 'taken' | 'too_soon' | 'too_many'
export type PhoneRefusal<Failure extends string> = { ok: false; error: Failure; retryAfterSeconds?: number }
export type PhoneVerificationResult = { ok: true } | PhoneRefusal<PhoneVerificationFailure>
export type PhoneVerificationStart = { ok: true; channel: VerificationChannel } | PhoneRefusal<PhoneVerificationFailure>

const refused = (error: PhoneVerificationFailure, retryAfterSeconds?: number): PhoneRefusal<PhoneVerificationFailure> => ({
    ok: false,
    error,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
})

const secondsUntil = (time: number, now: number) => Math.max(1, Math.ceil((time - now) / 1000))

export type SendLedger = { lastSentAt: string | null; lastChannel: VerificationChannel | null; sendCount: number; windowStartedAt: string | null }

// Where a number stands before one more code leaves for it: how long to wait, if it has to, and
// how many codes its window has already counted.
export function sendStanding(ledger: SendLedger, channel: VerificationChannel, now: number) {
    const interval = ledger.lastChannel && ledger.lastChannel !== channel ? MIN_SWITCH_INTERVAL_MS : MIN_RESEND_INTERVAL_MS
    const nextSendAt = ledger.lastSentAt ? Date.parse(ledger.lastSentAt) + interval : 0
    const windowStartedAt = ledger.windowStartedAt ? Date.parse(ledger.windowStartedAt) : null
    const windowIsOpen = windowStartedAt !== null && now - windowStartedAt < SEND_WINDOW_MS
    const sentInWindow = windowIsOpen ? ledger.sendCount : 0

    if (now < nextSendAt) return { refusal: 'too_soon' as const, retryAfterSeconds: secondsUntil(nextSendAt, now), windowIsOpen, sentInWindow }
    if (sentInWindow >= MAX_SENDS_PER_WINDOW) {
        return { refusal: 'too_many' as const, retryAfterSeconds: secondsUntil((windowStartedAt ?? now) + SEND_WINDOW_MS, now), windowIsOpen, sentInWindow }
    }
    return { refusal: null, retryAfterSeconds: undefined, windowIsOpen, sentInWindow }
}

// The row of the account asking is not verified yet, so a number that is held is held by another.
async function refusalFor(supabase: SupabaseClient<Database>, userId: string, phone: string): Promise<PhoneRefusal<PhoneVerificationFailure> | null> {
    const standing = await phoneStandingFor(supabase, { id: userId, email: null }, phone)
    if (standing === 'free') return null
    return refused(standing === 'unavailable' ? 'unavailable' : 'taken')
}

// `phone` is E.164 already. A number another account holds is turned away before anything is sent.
// The send is counted before it leaves, so requests fired together cannot
// each read a free slot, and given back when nothing reached the phone. The wait between two codes
// is the number's own: a visitor who mistyped it does not wait for the wrong one.
export async function startPhoneVerification(userId: string, phone: string, channel: VerificationChannel, language: string | null = null): Promise<PhoneVerificationStart> {
    const supabase = createServiceRoleClient()
    const { data: row } = await selectMaybeSingle(supabase, 'user_phones', USER_PHONE_COLUMNS, { user_id: userId })
    if (!row || row.verified_at) return refused('not_required')

    const held = await refusalFor(supabase, userId, phone)
    if (held) return held

    const now = Date.now()
    const sameNumber = row.phone === phone
    const previousChannel = sameNumber && isVerificationChannel(row.channel) ? row.channel : null
    const lastSentAt = sameNumber ? row.last_sent_at : null
    const standing = sendStanding({ lastSentAt, lastChannel: previousChannel, sendCount: row.send_count, windowStartedAt: row.send_window_started_at }, channel, now)
    if (standing.refusal) return refused(standing.refusal, standing.retryAfterSeconds)

    const stamp = new Date(now).toISOString()
    const { error } = await supabase
        .from('user_phones')
        .update<UserPhoneUpdate>({ phone, channel, send_count: standing.sentInWindow + 1, send_window_started_at: standing.windowIsOpen ? row.send_window_started_at : stamp, last_sent_at: stamp })
        .eq('user_id', userId)
    if (error) return refused('unavailable')

    const sent = await sendVerification(phone, channel, { language, previousChannel, lastSentAt, metadata: { context: 'wall', user_id: userId } })
    if (sent.ok) {
        // The ledger keeps where the code went, which is what the next switch moves away from.
        if (sent.channel !== channel) await supabase.from('user_phones').update<UserPhoneUpdate>({ channel: sent.channel }).eq('user_id', userId)
        return sent
    }

    // A country Bird Verify refuses outright gets no code on any channel: the number is kept as it is.
    if (sent.error === 'unsupported_country') {
        await skipPhoneVerification(userId, phone)
        return sent
    }

    await supabase.from('user_phones').update<UserPhoneUpdate>({ phone: row.phone, channel: row.channel, send_count: row.send_count, send_window_started_at: row.send_window_started_at, last_sent_at: row.last_sent_at }).eq('user_id', userId)
    return sent
}

export async function confirmPhoneVerification(userId: string, code: string): Promise<PhoneVerificationResult> {
    const supabase = createServiceRoleClient()
    const { data: row } = await selectMaybeSingle(supabase, 'user_phones', USER_PHONE_COLUMNS, { user_id: userId })
    if (!row) return refused('not_required')
    if (row.verified_at) return { ok: true }
    if (!row.phone) return refused('expired')

    // Checked again, before the code is spent: the number may have been taken while it was on its way.
    const held = await refusalFor(supabase, userId, row.phone)
    if (held) return held

    const checked = await checkVerification(row.phone, code)
    if (!checked.ok) return checked

    const stamp = new Date().toISOString()
    const { error } = await supabase.from('user_phones').update<UserPhoneUpdate>({ verified_at: stamp, contact_consent_at: stamp }).eq('user_id', userId)
    if (error) return refused(error.code === UNIQUE_VIOLATION ? 'taken' : 'unavailable')
    return { ok: true }
}

// The wall's "Skip for now": the account enters without a number and is asked again by the
// getting-started checklist. `unverifiablePhone` is a number in a country no code reaches: it is
// kept, and the checklist counts the step done. A number verified meanwhile keeps its row as it is.
export async function skipPhoneVerification(userId: string, unverifiablePhone?: string): Promise<boolean> {
    const stamp = new Date().toISOString()
    const { error } = await createServiceRoleClient()
        .from('user_phones')
        .update<UserPhoneUpdate>({ skipped_at: stamp, ...(unverifiablePhone ? { phone: unverifiablePhone, unverifiable_at: stamp } : {}) })
        .eq('user_id', userId)
        .is('verified_at', null)
    if (error) console.error('[phone] skip failed', error)
    return !error
}
