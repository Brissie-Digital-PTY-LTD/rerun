// What Supabase appends to the Site URL when a Google or Apple sign-in fails before it reaches
// `/auth/callback`. `bad_oauth_state` is the usual one: the flow outlived its state (a second tab,
// a back button, a sign-in left open), so GoTrue no longer knows the `redirectTo` and lands on `/`.
// It writes them to the query, and to the fragment as well depending on the flow.
const OAUTH_ERROR_PARAMS = ['error', 'error_code', 'error_description'] as const

function fragmentParams(url: URL): URLSearchParams {
    return new URLSearchParams(url.hash.replace(/^#/, ''))
}

function carriesOAuthError(params: URLSearchParams): boolean {
    return params.has('error_code') || params.has('error_description')
}

// The error code of a failed sign-in the URL came back with, or null when it carries none. A bare
// `error` is not enough: other flows landing on `/` may use that name for something else.
export function oauthErrorCode(url: URL): string | null {
    for (const params of [url.searchParams, fragmentParams(url)]) {
        if (carriesOAuthError(params)) return params.get('error_code') ?? params.get('error') ?? 'unknown'
    }
    return null
}

export function withoutOAuthError(url: URL): URL {
    const clean = new URL(url)
    if (carriesOAuthError(clean.searchParams)) for (const key of OAUTH_ERROR_PARAMS) clean.searchParams.delete(key)
    if (carriesOAuthError(fragmentParams(clean))) clean.hash = ''
    return clean
}

export function oauthErrorMessage(code: string): string {
    if (code === 'bad_oauth_state') return 'Sign-in took too long. Please try again.'
    if (code === 'access_denied') return 'Sign-in was cancelled.'
    return "Sign-in didn't go through. Please try again."
}
