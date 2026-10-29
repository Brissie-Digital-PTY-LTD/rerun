'use client'

import { AuthShell } from '@/components/auth/AuthShell'
import { useAnonymousSignUp } from '@/components/auth/useAnonymousSignUp'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { SignupSurface } from '@rerun/analytics'

type Variant = 'welcome' | 'build' | 'signin'

const COPY = {
    welcome: {
        title: 'Welcome to Rerun',
        subtitle: 'Create your account to start building your coworker team.',
    },
    build: {
        title: 'Your team is ready to be built',
        subtitle: 'Create your account and the Foreman starts building it right away.',
    },
    signin: {
        title: 'Welcome',
        subtitle: 'Sign in or create your account to get started.',
    },
} as const

// Account dialog for anonymous visitors. Three entry points share the exact same anonymous-aware flow
// (useAnonymousSignUp) and only differ in copy and in whether they can be dismissed: `welcome` is the
// wall an anonymous visitor meets when there is no welcome card to answer, and the only one that
// cannot be closed. `build` is opened from the Foreman column once the card is answered, `signin`
// from a pill; both stay one click away, so closing them loses nothing.
export function AuthDialog({ open, onOpenChange, variant = 'welcome' }: { open: boolean; onOpenChange: (open: boolean) => void; variant?: Variant }) {
    const copy = COPY[variant]
    const blocking = variant === 'welcome'
    const surface: SignupSurface = variant === 'build' ? 'foreman_intake' : blocking ? 'welcome_wall' : 'signin_dialog'
    const { form, abandon, reset } = useAnonymousSignUp({ surface, active: open, onEntered: () => onOpenChange(false) })

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            if (blocking) return
            abandon()
            reset()
        }
        onOpenChange(next)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange} dismissible={!blocking}>
            <DialogContent
                className="gap-0 overflow-hidden bg-background p-0 sm:h-[min(42rem,90dvh)] sm:w-[min(92vw,34rem)] sm:max-w-none sm:rounded-2xl"
                showCloseButton={!blocking}
                onEscapeKeyDown={e => blocking && e.preventDefault()}
                onPointerDownOutside={e => blocking && e.preventDefault()}
                onInteractOutside={e => blocking && e.preventDefault()}
            >
                <AuthShell title={copy.title} subtitle={copy.subtitle} titleAs={DialogTitle} variant="dialog">
                    {form}
                </AuthShell>
            </DialogContent>
        </Dialog>
    )
}
