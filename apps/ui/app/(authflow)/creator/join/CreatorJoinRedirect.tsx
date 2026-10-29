'use client'

import { Button } from '@/components/ui/button'
import { writePendingInviteCookie } from '@/lib/auth/pending-invite'
import { useEffect } from 'react'
import { JoinCard } from './JoinShell'

// Same handoff as the workspace invite: the cookie survives the round trip through Google, which
// drops the query string, and `/auth/callback` reads it back as the destination.
export function CreatorJoinRedirect({ token, name, email }: { token: string; name: string; email: string | null }) {
    const next = `/creator/join/${token}`
    const authUrl = `/auth?${email ? `email=${encodeURIComponent(email)}&` : ''}next=${encodeURIComponent(next)}`

    useEffect(() => {
        writePendingInviteCookie(next)
        window.location.href = authUrl
    }, [authUrl, next])

    return (
        <JoinCard>
            <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight">Welcome to the Rerun Creator program, {name}</h1>
                <p className="text-sm text-muted-foreground">Create your account{email ? ` with ${email}` : ''} to claim your sandbox.</p>
            </div>
            <Button className="w-full" onClick={() => (window.location.href = authUrl)}>
                Continue
            </Button>
        </JoinCard>
    )
}
