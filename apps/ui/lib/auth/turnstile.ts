import 'server-only'

import { RERUN_CLOUD } from '@rerun/cloud/edition'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// Whether Cloudflare vouches for the visitor behind this token. Where no secret is set, a local
// stack lets everyone through and Rerun Cloud lets nobody: a missing key must not open the tap. A
// self-hosted install has the captcha only once it sets the keys.
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) return process.env.NODE_ENV !== 'production' || !RERUN_CLOUD
    if (!token) return false
    try {
        const response = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, response: token, remoteip: ip }),
        })
        const body = (await response.json()) as { success?: boolean; 'error-codes'?: string[] }
        if (!body.success) console.error('[turnstile] token refused', body['error-codes'])
        return body.success === true
    } catch (error) {
        console.error('[turnstile] siteverify failed', error)
        return false
    }
}
