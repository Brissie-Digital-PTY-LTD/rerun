'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/supabase/client'
import { useState } from 'react'

export function InviteMismatch({ inviteEmail, currentEmail, workspaceName }: { inviteEmail: string; currentEmail: string; workspaceName: string }) {
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const switchAccount = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        window.location.href = `/auth?email=${encodeURIComponent(inviteEmail)}&next=${encodeURIComponent(window.location.pathname)}`
    }

    return (
        <Card className="space-y-4 p-8">
            <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight">Wrong account</h1>
                <p className="text-sm text-muted-foreground">
                    This invitation to <strong>{workspaceName}</strong> is for <strong>{inviteEmail}</strong>, but you are signed in as <strong>{currentEmail}</strong>.
                </p>
            </div>
            <Button className="w-full" onClick={switchAccount} loading={loading}>
                Sign in as {inviteEmail}
            </Button>
        </Card>
    )
}
