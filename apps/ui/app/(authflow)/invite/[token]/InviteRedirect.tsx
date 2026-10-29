'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { writePendingInviteCookie } from '@/lib/auth/pending-invite'
import { useEffect } from 'react'

export function InviteRedirect({ token, email, workspaceName }: { token: string; email: string; workspaceName: string }) {
    const next = `/invite/${token}`
    const authUrl = `/auth?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`

    useEffect(() => {
        writePendingInviteCookie(next)
        window.location.href = authUrl
    }, [authUrl, next])

    return (
        <Card className="space-y-4 p-8">
            <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight">You are invited to {workspaceName}</h1>
                <p className="text-sm text-muted-foreground">Sign in or create your account with {email} to join this workspace.</p>
            </div>
            <Button className="w-full" onClick={() => (window.location.href = authUrl)}>
                Continue
            </Button>
        </Card>
    )
}
