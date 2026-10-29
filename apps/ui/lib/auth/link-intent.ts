import { OAUTH_PROVIDER_CONFIG, type OAuthProvider } from '@/lib/auth/oauth-providers'

// Set by the account settings before leaving for the provider, read by `/auth/callback` on the way
// back: it is what tells an identity being connected to the signed-in account from a sign-in. It
// holds the provider, which the settings name when the connection was refused.
export const LINK_INTENT_COOKIE = 'rr_link_intent'
const LINK_INTENT_MAX_AGE_SECONDS = 600

export const ACCOUNT_PARAM = 'account'
export const ACCOUNT_LINK_ERROR_PARAM = 'link_error'
export const ACCOUNT_LINK_PROVIDER_PARAM = 'link_provider'

export function rememberLinkIntent(provider: OAuthProvider) {
    document.cookie = `${LINK_INTENT_COOKIE}=${provider}; path=/; max-age=${LINK_INTENT_MAX_AGE_SECONDS}; samesite=lax`
}

export function forgetLinkIntent() {
    document.cookie = `${LINK_INTENT_COOKIE}=; path=/; max-age=0; samesite=lax`
}

export function linkErrorMessage(code: string, provider: OAuthProvider): string {
    const { label } = OAUTH_PROVIDER_CONFIG[provider]
    if (code === 'identity_already_exists') return `This ${label} account already signs into another Rerun account.`
    if (code === 'access_denied') return `${label} was not connected.`
    return `Could not connect ${label}. Try again.`
}
