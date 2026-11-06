import { reachableChannels, type PhoneChannel } from '@rerun/contracts'
import { useState } from 'react'

import { useSignInFlow } from '@/components/auth/SignInFlow'
import { signInWithApple } from '@/auth/apple'
import { signInWithGoogle } from '@/auth/google'
import { sendEmailCode, sendPhoneCode, SignInError } from '@/auth/sign-in'
import { track } from '@/lib/analytics'
import { isPossibleNumber } from '@/lib/phone'

export const CHANNEL_LABELS: Record<PhoneChannel, string> = { whatsapp: 'Send by WhatsApp', sms: 'Send by SMS' }

export const messageOf = (failure: unknown) => (failure instanceof SignInError ? failure.message : 'Something went wrong. Try again.')

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

// The phone number leads: it signs into the account that holds it, or creates one.
export function usePhoneCode() {
    const { country, phone, goTo, setThinking } = useSignInFlow()
    const [sending, setSending] = useState<PhoneChannel | null>(null)
    const [error, setError] = useState<string | null>(null)
    const channels = reachableChannels(country, 'verify')

    const send = async (channel: PhoneChannel) => {
        if (!isPossibleNumber(phone, country)) return setError('Enter a valid mobile number.')
        track('signup_method_selected', { method: 'phone' })
        setSending(channel)
        setThinking(true)
        setError(null)
        try {
            const sentBy = await sendPhoneCode({ phone, country, channel })
            goTo({ name: 'code', method: 'phone', channel: sentBy })
        } catch (failure) {
            // Back from the code step within the minute: the code already sent is still the one to type.
            if (failure instanceof SignInError && failure.reason === 'too_soon') {
                goTo({ name: 'code', method: 'phone', channel, resendIn: failure.retryAfterSeconds ?? 0 })
                return
            }
            setError(messageOf(failure))
        } finally {
            setSending(null)
            setThinking(false)
        }
    }

    return { channels, send, sending, error, clearError: () => setError(null) }
}

export function useEmailCode() {
    const { email, goTo, setThinking } = useSignInFlow()
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const send = async () => {
        if (!looksLikeEmail(email)) return setError('Enter a valid email')
        track('signup_method_selected', { method: 'email' })
        setSending(true)
        setThinking(true)
        setError(null)
        try {
            await sendEmailCode(email.trim())
            goTo({ name: 'code', method: 'email' })
        } catch (failure) {
            setError(messageOf(failure))
        } finally {
            setSending(false)
            setThinking(false)
        }
    }

    return { send, sending, error, clearError: () => setError(null) }
}

// Once the session opens, the root layout swaps the sign-in screens for the app on its own.
export function useOAuthSignIn() {
    const { setThinking } = useSignInFlow()
    const [signingIn, setSigningIn] = useState<'apple' | 'google' | null>(null)
    const [error, setError] = useState<string | null>(null)

    const continueWith = async (method: 'apple' | 'google') => {
        if (signingIn) return
        track('signup_method_selected', { method })
        setSigningIn(method)
        setThinking(true)
        setError(null)
        try {
            await (method === 'apple' ? signInWithApple() : signInWithGoogle())
        } catch (failure) {
            setError(messageOf(failure))
        } finally {
            setSigningIn(null)
            setThinking(false)
        }
    }

    return { continueWith, signingIn, error }
}
