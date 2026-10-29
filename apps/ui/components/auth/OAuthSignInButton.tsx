'use client'

import { Button } from '@/components/ui/button'
import { OAUTH_PROVIDER_CONFIG, type OAuthProvider } from '@/lib/auth/oauth-providers'
import { startOAuthSignIn } from '@/lib/auth/oauth-sign-in'
import { ProviderIcon } from '@/lib/engine/provider-icons'
import { useInAppBrowser } from '@/lib/use-in-app-browser'
import { track } from '@rerun/analytics/client'

// Where the provider refuses an in-app browser the button is not drawn at all, and the other ways in
// are what is left.
export function OAuthSignInButton({ provider, verb, linkAnonymous = false, onLeave }: { provider: OAuthProvider; verb: 'Sign in with' | 'Continue with'; linkAnonymous?: boolean; onLeave?: () => void }) {
    const inAppBrowser = useInAppBrowser()
    const { label, refusedInAppBrowser } = OAUTH_PROVIDER_CONFIG[provider]
    if (inAppBrowser && refusedInAppBrowser) return null

    const onClick = async () => {
        track('signup_method_selected', { method: provider })
        onLeave?.()
        await startOAuthSignIn(provider, { linkAnonymous })
    }

    return (
        <Button variant="outline" className="w-full gap-2" onClick={onClick}>
            <ProviderIcon provider={provider} className="size-4" />
            <span>
                {verb} {label}
            </span>
        </Button>
    )
}
