'use client'

import { continueWithoutCodeAction, sendPhoneCodeAction, skipPhoneStepAction, verifyPhoneCodeAction } from '@/app/api/_actions/phone.actions'
import { PhoneCodeForm, type PhoneCodeRequest } from '@/components/auth/PhoneCodeForm'
import { PhoneSendError, sendPhoneCode } from '@/components/auth/phone-send'
import { Button } from '@/components/ui/button'
import { useSession } from '@/supabase/session/SessionProvider'
import { track } from '@rerun/analytics/client'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// What a new account answers before it enters the app, wherever it is drawn: the phone wall's dialog
// and the arrival column mount the same form. `active` is whether it is on screen.
export function PhoneVerificationStep({ active }: { active: boolean }) {
    const { session, refreshPhoneStep, signOut } = useSession()
    const [skipping, setSkipping] = useState(false)

    const viewed = useRef(false)
    useEffect(() => {
        if (!active || viewed.current) return
        viewed.current = true
        track('phone_wall_viewed', {})
    }, [active])

    // A country Bird refuses outright: the server has already taken the number in without a code.
    const sendCode = async (request: PhoneCodeRequest) => {
        try {
            return await sendPhoneCode('wall', request, () => sendPhoneCodeAction(request))
        } catch (error) {
            if (error instanceof PhoneSendError && error.reason === 'unsupported_country') {
                track('phone_wall_unverifiable', { country: request.country, via: 'bird' })
                await refreshPhoneStep()
            }
            throw error
        }
    }

    const continueWithoutCode = async (request: Omit<PhoneCodeRequest, 'channel'>) => {
        const result = await continueWithoutCodeAction(request)
        if (!result.ok) throw new Error(result.error)
        track('phone_wall_unverifiable', { country: request.country, via: 'reach' })
        await refreshPhoneStep()
    }

    const verifyCode = async (code: string, { channel }: PhoneCodeRequest) => {
        const result = await verifyPhoneCodeAction({ code })
        if (!result.ok) throw new PhoneSendError(result.error, undefined, result.reason)
        track('phone_verification_completed', { channel, context: 'wall' })
        toast.success('Phone number verified')
        await refreshPhoneStep()
    }

    const skip = async () => {
        setSkipping(true)
        try {
            const result = await skipPhoneStepAction()
            if (!result.ok) throw new Error(result.error)
            track('phone_wall_skipped', {})
            await refreshPhoneStep()
        } catch {
            toast.error('Could not skip this step. Try again.')
            setSkipping(false)
        }
    }

    return (
        <>
            <PhoneCodeForm
                persistKey={session ? `phone-wall:${session.user.id}` : undefined}
                sendCode={sendCode}
                verifyCode={verifyCode}
                continueWithoutCode={continueWithoutCode}
                skip={deadEndReason => (
                    <div className="space-y-2">
                        {deadEndReason === 'taken' && (
                            <Button type="button" variant="outline" onClick={signOut} className="w-full">
                                Sign in with this number
                            </Button>
                        )}
                        <Button type="button" variant="ghost" onClick={skip} disabled={skipping} className="w-full text-muted-foreground">
                            Skip for now
                        </Button>
                    </div>
                )}
            />
            <div className="flex flex-col items-center gap-2">
                <p className="text-center text-sm text-muted-foreground">
                    Not you?{' '}
                    <button type="button" onClick={signOut} className="underline underline-offset-4 transition-colors hover:text-foreground">
                        Sign out
                    </button>
                </p>
            </div>
        </>
    )
}
