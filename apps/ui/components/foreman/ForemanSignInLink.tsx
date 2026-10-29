'use client'

import { useState } from 'react'

import { AuthDialog } from '@/components/dialogs/AuthDialog'

export function ForemanSignInLink() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <p className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setOpen(true)}>
                    Sign in
                </button>
            </p>

            <AuthDialog variant="signin" open={open} onOpenChange={setOpen} />
        </>
    )
}
