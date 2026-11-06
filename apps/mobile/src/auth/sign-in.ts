import { appSessionSchema, emailCodePreparedSchema, meSchema, phoneCodeSentSchema, signInRefusalSchema, type Me, type PhoneChannel, type PhoneCodeRequest } from '@rerun/contracts'

import { api, ApiError } from '@/api/client'
import { supabase } from '@/auth/supabase'

export const CODE_LENGTH = 6

// `message` is what the screen shows, `reason` what analytics count.
export class SignInError extends Error {
    constructor(
        message: string,
        readonly reason: string,
        readonly retryAfterSeconds?: number
    ) {
        super(message)
        this.name = 'SignInError'
    }
}

const OFFLINE = new SignInError('We could not reach Rerun. Check your connection and try again.', 'network')

async function hubCall<T>(schema: { parse: (value: unknown) => T }, path: string, body: unknown): Promise<T> {
    try {
        return schema.parse(await api(path, { method: 'POST', body }))
    } catch (error) {
        const refusal = error instanceof ApiError ? signInRefusalSchema.safeParse(error.body) : null
        if (refusal?.success) throw new SignInError(refusal.data.error, refusal.data.reason, refusal.data.retryAfterSeconds)
        throw OFFLINE
    }
}

export async function sendPhoneCode(request: PhoneCodeRequest): Promise<PhoneChannel> {
    const { channel } = await hubCall(phoneCodeSentSchema, '/api/v1/auth/phone/code', request)
    return channel
}

// Returns whether the number had no account yet: this sign-in created it.
export async function signInWithPhone(request: PhoneCodeRequest, code: string): Promise<boolean> {
    const { created, session } = await hubCall(appSessionSchema, '/api/v1/auth/phone/session', { ...request, code })
    const { error } = await supabase.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken })
    if (error) throw new SignInError('We could not open your session. Try again.', 'session')
    return created
}

// The hub mails a code still good again rather than let Supabase void it, or opens the account of a new
// address; in that second case the code comes from Supabase itself.
export async function sendEmailCode(email: string): Promise<void> {
    const { mailed } = await hubCall(emailCodePreparedSchema, '/api/v1/auth/email/code', { email })
    if (mailed) return
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (error?.status === 429) throw new SignInError('Too many codes asked for this address. Try again later.', 'rate_limited')
    if (error) throw new SignInError('We could not send your code. Try again.', 'unavailable')
}

export async function signInWithEmail(email: string, code: string): Promise<void> {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) throw new SignInError('This code is wrong or has expired.', 'wrong_code')
}

export async function bootstrap(accessToken: string): Promise<Me> {
    return meSchema.parse(await api('/api/v1/bootstrap', { method: 'POST', accessToken }))
}
