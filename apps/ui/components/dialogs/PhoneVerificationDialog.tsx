'use client'

import { AuthShell } from '@/components/auth/AuthShell'
import { PhoneVerificationStep } from '@/components/auth/PhoneVerificationStep'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

// The second wall of a signup: a new account enters the app once its phone number is verified or the
// step skipped. It is driven by the account's own state rather than by the form that created it,
// because an account is born through four doors (the typed code, the button in the email, Google,
// /auth) and only one of them comes back to a form. Escape and a click outside do nothing: the way
// past it is "Skip for now", offered once the visitor is stuck, and the getting-started checklist
// asks for the number again.
export function PhoneVerificationDialog({ open }: { open: boolean }) {
    return (
        <Dialog open={open} dismissible={false}>
            <DialogContent
                className="gap-0 overflow-hidden bg-background p-0 sm:h-[min(42rem,90dvh)] sm:w-[min(92vw,34rem)] sm:max-w-none sm:rounded-2xl"
                showCloseButton={false}
                onEscapeKeyDown={event => event.preventDefault()}
                onPointerDownOutside={event => event.preventDefault()}
                onInteractOutside={event => event.preventDefault()}
            >
                <AuthShell title="One last step" subtitle="Verify your phone number to secure your account." titleAs={DialogTitle} variant="dialog">
                    <PhoneVerificationStep active={open} />
                </AuthShell>
            </DialogContent>
        </Dialog>
    )
}
