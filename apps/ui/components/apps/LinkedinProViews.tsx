'use client'

import { useState, type FormEvent } from 'react'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { PanelScroller } from '@/components/ui/panel-list'
import { Segmented } from '@/components/ui/segmented'
import { countryFlag } from '@/lib/phone/normalize'
import { AlertCircleIcon, BellRing, LockIcon, MailIcon, SendIcon, ShieldCheckIcon, Smartphone, UserSearchIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { LinkedinApproveFigure } from './LinkedinFigure'
import { LINKUP_COUNTRIES } from './linkedin-countries'
import { AppIcon, StepHero, type AppPresentation } from './PaidAppViews'

export const CODE_LENGTH = 6

export type LinkedinCredentials = { country: string } & ({ email: string; password: string } | { loginToken: string })

// While the LinkedIn app approval is pending: checked on its own every few seconds, then handed
// back to the person once it has waited long enough to be worth a look at the phone.
export type ApprovalWait = 'polling' | 'slow'

export function LinkedinIcon(props: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
    return <AppIcon slug="linkedin" {...props} />
}

export const LINKEDIN_PRESENTATION: AppPresentation = {
    slug: 'linkedin',
    pitch: 'Your coworkers prospect from your LinkedIn account. They write, connect and follow up for you.',
    capabilities: [
        { icon: SendIcon, title: 'Messages and invitations', text: 'Writes to prospects and follows up, inside LinkedIn’s daily limits.' },
        { icon: UserSearchIcon, title: 'Search and read profiles', text: 'Finds the right people and reads their profile before writing.' },
        { icon: BellRing, title: 'Wakes up on replies', text: 'A reply or an accepted invitation starts the coworker right away.' },
    ],
}

// Linkup says UK where a flag needs GB.
const COUNTRY_OPTIONS = LINKUP_COUNTRIES.map(country => ({
    value: country.code,
    label: country.name,
    keywords: [country.code],
    leading: (
        <span aria-hidden className="text-base leading-none">
            {countryFlag((country.code === 'UK' ? 'GB' : country.code) as Parameters<typeof countryFlag>[0])}
        </span>
    ),
}))

type SignInWith = 'password' | 'cookie'

type ConnectScreenProps = {
    defaultCountry: string
    pending: boolean
    error: string | null
    initialMethod?: SignInWith
    onSubmit: (credentials: LinkedinCredentials) => void
}

export function ConnectScreen({ defaultCountry, pending, error, initialMethod = 'password', onSubmit }: ConnectScreenProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loginToken, setLoginToken] = useState('')
    const [country, setCountry] = useState(defaultCountry)
    const [method, setMethod] = useState<SignInWith>(initialMethod)
    const preferred = COUNTRY_OPTIONS.find(option => option.value === defaultCountry)
    const countries = preferred ? [preferred, ...COUNTRY_OPTIONS.filter(option => option !== preferred)] : COUNTRY_OPTIONS

    const submit = (event: FormEvent) => {
        event.preventDefault()
        if (pending) return
        onSubmit(method === 'cookie' ? { country, loginToken: loginToken.trim() } : { country, email: email.trim(), password })
    }

    return (
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <PanelScroller className="space-y-4 p-4">
                <Segmented
                    value={method}
                    onChange={setMethod}
                    options={[
                        { value: 'password', label: 'Email and password' },
                        { value: 'cookie', label: 'Session cookie' },
                    ]}
                />
                {method === 'cookie' ? (
                    <Input
                        label="Session cookie (li_at)"
                        placeholder="AQEDAR..."
                        required
                        value={loginToken}
                        onChange={event => setLoginToken(event.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        className="h-8 font-mono text-xs"
                        helperText="For an account you open with Google or Apple. Copy the li_at cookie of linkedin.com from your browser."
                    />
                ) : (
                    <>
                        <Input label="LinkedIn email" type="email" placeholder="jane@company.com" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className="h-8" />
                        <Input label="LinkedIn password" type="password" placeholder="Your LinkedIn password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="h-8" />
                    </>
                )}
                <Field label="Sign in from" helperText="LinkedIn trusts a sign-in from the country you usually work from.">
                    <Combobox groups={[{ id: 'countries', options: countries }]} value={country} onChange={setCountry} searchPlaceholder="Search a country" emptyText="No country found" />
                </Field>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LockIcon className="size-3.5 shrink-0" />
                    Rerun never stores your password or your cookie.
                </p>
                {error && (
                    <Alert variant="danger">
                        <AlertCircleIcon />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </PanelScroller>
            <footer className="flex justify-end border-t px-4 py-3">
                <Button type="submit" loading={pending} className="max-sm:w-full">
                    Connect
                </Button>
            </footer>
        </form>
    )
}

type CheckpointScreenProps = {
    checkpointType: string
    sentTo: string | null
    pending: boolean
    error: string | null
    waiting?: ApprovalWait | null
    onSubmit: (code?: string) => void
    onResend: () => void
}

export function CheckpointScreen({ checkpointType, sentTo, pending, error, waiting = null, onSubmit, onResend }: CheckpointScreenProps) {
    if (checkpointType === 'app_approval') return <ApprovalScreen pending={pending} error={error} waiting={waiting} onSubmit={() => onSubmit()} />
    return <CodeScreen checkpointType={checkpointType} sentTo={sentTo} pending={pending} error={error} onSubmit={onSubmit} onResend={onResend} />
}

function ApprovalScreen({ pending, error, waiting, onSubmit }: { pending: boolean; error: string | null; waiting: ApprovalWait | null; onSubmit: () => void }) {
    return (
        <>
            <PanelScroller className="flex flex-col justify-center px-5 pb-6">
                <StepHero visual={<LinkedinApproveFigure label="A phone showing the sign-in request, its approve key lit" className="max-w-80 max-sm:max-w-60" />} title="Approve on your phone">
                    LinkedIn sent a sign-in request to your phone. Open the LinkedIn app and tap <span className="font-medium text-foreground">Yes</span>.
                </StepHero>
                <div className="mt-4 flex justify-center">
                    <WaitingLine waiting={waiting} />
                </div>
            </PanelScroller>
            <footer className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t px-4 py-3">
                {error && <p className="min-w-0 flex-1 text-[11px] text-destructive">{error}</p>}
                <Button variant={waiting === 'slow' ? 'default' : 'outline'} loading={pending} onClick={onSubmit} className="max-sm:w-full">
                    I approved it
                </Button>
            </footer>
        </>
    )
}

function WaitingLine({ waiting }: { waiting: ApprovalWait | null }) {
    if (!waiting) return null
    return (
        <span className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            <span className={cn('size-1.5 rounded-full', waiting === 'polling' ? 'animate-pulse bg-primary' : 'bg-muted-foreground')} />
            {waiting === 'polling' ? 'Waiting for your approval' : 'Still nothing? Check the LinkedIn app, then tap below.'}
        </span>
    )
}

function CodeScreen({ checkpointType, sentTo, pending, error, onSubmit, onResend }: Omit<CheckpointScreenProps, 'waiting'>) {
    const [code, setCode] = useState('')
    const where = checkpointType === 'authenticator_app' ? 'from your authenticator app' : sentTo ? `LinkedIn sent to your ${sentTo}` : `LinkedIn sent by ${checkpointType === 'sms' ? 'text message' : 'email'}`
    const CodeIcon = checkpointType === 'authenticator_app' ? ShieldCheckIcon : checkpointType === 'sms' ? Smartphone : MailIcon

    return (
        <form
            onSubmit={event => {
                event.preventDefault()
                if (code.length === CODE_LENGTH) onSubmit(code)
            }}
            className="flex min-h-0 flex-1 flex-col"
        >
            <PanelScroller className="flex flex-col justify-center px-5 pt-8 pb-6">
                <StepHero
                    visual={
                        <span className="mb-4 flex size-12 items-center justify-center rounded-xl border bg-muted/40">
                            <CodeIcon className="size-5 text-muted-foreground" />
                        </span>
                    }
                    title="Enter the code"
                >
                    The {CODE_LENGTH}-digit code {where}.
                </StepHero>
                <div className="mt-6 flex flex-col items-center gap-3">
                    <InputOTP maxLength={CODE_LENGTH} pattern={REGEXP_ONLY_DIGITS} autoComplete="one-time-code" autoFocus disabled={pending} value={code} onChange={setCode} onComplete={value => onSubmit(value)}>
                        <InputOTPGroup>
                            {Array.from({ length: CODE_LENGTH }, (_, index) => (
                                <InputOTPSlot key={index} index={index} />
                            ))}
                        </InputOTPGroup>
                    </InputOTP>
                    {checkpointType !== 'authenticator_app' && (
                        <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" disabled={pending} onClick={onResend}>
                            Send a new code
                        </button>
                    )}
                </div>
            </PanelScroller>
            <footer className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t px-4 py-3">
                {error && <p className="min-w-0 flex-1 text-[11px] text-destructive">{error}</p>}
                <Button type="submit" loading={pending} disabled={code.length !== CODE_LENGTH} className="max-sm:w-full">
                    Verify
                </Button>
            </footer>
        </form>
    )
}
