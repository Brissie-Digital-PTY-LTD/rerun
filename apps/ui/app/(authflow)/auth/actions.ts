'use server'

import { ensureEmailAccount } from '@/app/api/_services/email-sign-up.service'
import { resendSignInCodeIfLive } from '@/app/api/_services/sign-in-code.service'
import { provisionUser } from '@/app/api/_services/user-provisioning.service'
import { callerIp } from '@/lib/auth/caller-ip'
import { EMAIL_PREPARATION_MESSAGES, type EmailPreparationFailure } from '@/lib/auth/email-sign-in-messages'
import { PENDING_INVITE_COOKIE } from '@/lib/auth/pending-invite'
import { verifyTurnstile } from '@/lib/auth/turnstile'
import { drawPriceArm } from '@/cloud/billing'
import { normalizeEmail } from '@/lib/email'
import { createClient } from '@/supabase/server'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { EXPERIMENT_COOKIE } from '@rerun/analytics/experiments'
import { CONSENT_COOKIE } from '@rerun/contracts'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'

export async function checkEmailExists(email: string): Promise<{ exists: boolean }> {
    const { data, error } = await createServiceRoleClient().rpc('check_email_exists', { email: normalizeEmail(email) })
    if (error) throw error
    return { exists: !!data }
}

// Asked before every new code: Supabase voids the previous code each time it mints one, so while
// the last one is still good it is mailed again instead. `resent: false` means ask Supabase, `held`
// that the last one left less than a minute ago and nothing new was mailed.
export async function resendLiveSignInCode(email: string): Promise<{ resent: boolean; held: boolean }> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    const outcome = await resendSignInCodeIfLive(normalizeEmail(email), data.user?.id ?? null)
    return { resent: outcome !== null, held: outcome === 'held' }
}

const prepareSchema = z.object({ email: z.string().trim().email().max(320), captchaToken: z.string().max(4096).optional() })

export type EmailSignInPreparation = { ok: true; created: boolean } | { ok: false; error: string; reason: EmailPreparationFailure }

const preparationRefused = (reason: EmailPreparationFailure): EmailSignInPreparation => ({ ok: false, error: EMAIL_PREPARATION_MESSAGES[reason], reason })

// Called before Supabase is asked for a new code, which it then mails to an account that exists.
export async function prepareEmailSignIn(input: z.input<typeof prepareSchema>): Promise<EmailSignInPreparation> {
    const parsed = prepareSchema.safeParse(input)
    if (!parsed.success) return preparationRefused('invalid_email')

    const ip = callerIp(await headers())
    if (!(await verifyTurnstile(parsed.data.captchaToken, ip))) return preparationRefused('captcha_failed')

    const result = await ensureEmailAccount(normalizeEmail(parsed.data.email), ip)
    return result.ok ? result : preparationRefused(result.error)
}

export type SignupCompletion = { ok: true; signedUp: boolean } | { ok: false }

// The browser converts the anonymous session on its own, and the server stamps the signup on
// whichever request comes next. This is that request, made so the signup form can wait for the
// stamp instead of leaving the tab to learn it from realtime. Same inputs as the middleware's
// provisioning; from `/` alone, so the invite paths are not looked at.
export async function completeSignupAction(): Promise<SignupCompletion> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user || data.user.is_anonymous) return { ok: false }
    const cookieStore = await cookies()
    const provisioned = await provisionUser(supabase, data.user, {
        phoneStep: !cookieStore.has(PENDING_INVITE_COOKIE),
        priceArm: drawPriceArm({
            experimentCookie: cookieStore.get(EXPERIMENT_COOKIE)?.value,
            consentCookie: cookieStore.get(CONSENT_COOKIE)?.value,
            userAgent: (await headers()).get('user-agent'),
        }),
    })
    return provisioned ? { ok: true, signedUp: provisioned.signedUp } : { ok: false }
}
