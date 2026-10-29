'use client'

import { prepareEmailSignIn, resendLiveSignInCode } from '@/app/(authflow)/auth/actions'
import { EmailCodeForm, type EmailCodeStep } from '@/components/auth/EmailCodeForm'
import { useTurnstile } from '@/components/auth/useTurnstile'
import { cn } from '@/lib/utils'
import { createClient } from '@/supabase/client'
import { SIGNUP_INTENT_COOKIE } from '@rerun/analytics'
import { setSharedCookie } from '@rerun/analytics/client'
import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'

// One flow for both sign-in and sign-up: the server opens the account first if the address is new,
// then Supabase mails the code. The intent cookie is only set when the server did open it: an
// existing account signing in on a new browser soon after its signup would otherwise be counted
// twice. A code mailed again keeps the cookie the first one set.
export default function EmailAuth({ beforeEmail, onStepChange, onSignedIn }: { beforeEmail?: ReactNode; onStepChange: (step: EmailCodeStep) => void; onSignedIn: () => void }) {
    const searchParams = useSearchParams()
    const supabase = createClient()
    const { containerRef, challenging, getToken } = useTurnstile()

    const sendCode = async (email: string) => {
        const live = await resendLiveSignInCode(email)
        if (live.resent) return live.held ? 'held' : undefined
        const prepared = await prepareEmailSignIn({ email, captchaToken: await getToken() })
        if (!prepared.ok) throw new Error(prepared.error)
        if (prepared.created) setSharedCookie(SIGNUP_INTENT_COOKIE, 'email', 1)
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
        if (error) throw error
    }

    const verifyCode = async (email: string, code: string) => {
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
        if (error) throw error
        onSignedIn()
    }

    return (
        <div>
            <EmailCodeForm defaultEmail={searchParams.get('email') ?? ''} sendCode={sendCode} verifyCode={verifyCode} onStepChange={onStepChange} beforeEmail={beforeEmail} />
            <div ref={containerRef} className={cn('flex justify-center', challenging && 'mt-4')} />
        </div>
    )
}
