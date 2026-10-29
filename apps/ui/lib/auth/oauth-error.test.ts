import { describe, expect, it } from 'vitest'
import { oauthErrorCode, oauthErrorMessage, withoutOAuthError } from './oauth-error'

const FAILED = 'https://app.rerun.build/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired'

describe('oauthErrorCode', () => {
    it('reads the code Supabase put in the query', () => {
        expect(oauthErrorCode(new URL(FAILED))).toBe('bad_oauth_state')
    })

    it('reads it from the fragment too', () => {
        expect(oauthErrorCode(new URL('https://app.rerun.build/#error=access_denied&error_description=denied'))).toBe('access_denied')
    })

    it('ignores a bare `error` some other flow may use', () => {
        expect(oauthErrorCode(new URL('https://app.rerun.build/?error=1'))).toBeNull()
        expect(oauthErrorCode(new URL('https://app.rerun.build/?billing=success'))).toBeNull()
    })
})

describe('withoutOAuthError', () => {
    it('drops the three params and keeps everything else', () => {
        expect(withoutOAuthError(new URL(`${FAILED}&template=seo`)).href).toBe('https://app.rerun.build/?template=seo')
    })

    it('drops a fragment that carries the error, and only that one', () => {
        expect(withoutOAuthError(new URL('https://app.rerun.build/#error=x&error_code=bad_oauth_state')).href).toBe('https://app.rerun.build/')
        expect(withoutOAuthError(new URL('https://app.rerun.build/#section')).href).toBe('https://app.rerun.build/#section')
    })
})

describe('oauthErrorMessage', () => {
    it('says what happened in words a user can act on', () => {
        expect(oauthErrorMessage('bad_oauth_state')).toBe('Sign-in took too long. Please try again.')
        expect(oauthErrorMessage('access_denied')).toBe('Sign-in was cancelled.')
        expect(oauthErrorMessage('server_error')).toBe("Sign-in didn't go through. Please try again.")
    })
})
