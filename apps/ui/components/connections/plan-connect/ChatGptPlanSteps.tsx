'use client'

import { useState, type ReactNode } from 'react'

import type { CodexDeviceAuth } from '@/components/connections/use-codex-device-auth'
import { Button } from '@/components/ui/button'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import { ProviderIcon } from '@/lib/engine/provider-icons'
import { CheckIcon, ChevronRightIcon, CopyIcon, ExternalLinkIcon, TriangleAlertIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

import { ADMIN_MESSAGE, CHATGPT_SECURITY_URL, DEVICE_CODE_SETTING, STUCK_AFTER_MS } from './chatgpt-setup'
import { ForemanTrack, type TrackStep } from './ForemanTrack'
import { StepError } from './step-bits'

// OpenAI only takes the device code once the account allows it, a switch in ChatGPT's own settings
// (or the workspace admin's, on a Business or Enterprise plan). Nothing tells us it is off: the
// approval just never comes. So the switch is the first step, one click away for whoever already
// flipped it ("It's already on" goes straight for the code), and the wait brings it back up.
export function ChatGptPlanSteps({ auth, lastStep }: { auth: CodexDeviceAuth; lastStep: (linked: boolean) => TrackStep }) {
    const [settingsOpened, setSettingsOpened] = useState(false)
    const [workspacePlan, setWorkspacePlan] = useState(false)
    const { phase } = auth
    const linked = phase === 'connected'
    const onCode = settingsOpened || phase !== 'idle' || auth.expired || auth.error !== null
    const stuck = auth.expired || (phase === 'waiting' && auth.waitedMs > STUCK_AFTER_MS)
    const last = lastStep(linked)

    return (
        <ForemanTrack
            at={linked ? 2 : onCode ? 1 : 0}
            done={linked ? 3 : onCode ? 1 : 0}
            orb={phase === 'starting' || phase === 'waiting' ? 'thinking' : linked ? 'speaking' : 'listening'}
            remark={(linked && last.remark) || remarkFor(auth, onCode, stuck)}
            thinking={phase === 'starting' || (phase === 'waiting' && !stuck)}
            steps={[
                {
                    title: 'Allow sign-in by code in ChatGPT',
                    body: !onCode && (
                        <div className="flex flex-col items-start gap-2">
                            <div className="flex flex-wrap gap-2">
                                <Button asChild className="gap-1.5">
                                    <a href={CHATGPT_SECURITY_URL} target="_blank" rel="noopener noreferrer" onClick={() => setSettingsOpened(true)}>
                                        Open ChatGPT settings
                                        <ExternalLinkIcon className="size-3" />
                                    </a>
                                </Button>
                                <Button type="button" variant="outline" onClick={auth.start} className="gap-1.5">
                                    <CheckIcon />
                                    It&apos;s already on
                                </Button>
                            </div>
                            <SettingHint workspacePlan={workspacePlan} onToggle={() => setWorkspacePlan(value => !value)} />
                        </div>
                    ),
                },
                { title: 'Enter the code on OpenAI', body: <CodeStep auth={auth} primary={onCode} stuck={stuck} workspacePlan={workspacePlan} /> },
                last,
            ]}
        />
    )
}

function remarkFor(auth: CodexDeviceAuth, onCode: boolean, stuck: boolean) {
    if (auth.phase === 'connected') return 'All set!'
    if (auth.phase === 'starting') return 'Getting a code'
    if (auth.expired) return 'That code ran out.'
    if (auth.phase === 'waiting') return stuck ? 'Still nothing from OpenAI.' : 'Waiting for OpenAI'
    return onCode ? 'Now grab a code.' : 'Turn this on once.'
}

const SETTING_PATH = ['Settings', 'Security', DEVICE_CODE_SETTING]

function SettingHint({ workspacePlan, onToggle }: { workspacePlan: boolean; onToggle: () => void }) {
    return (
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            {workspacePlan ? (
                <p className="leading-relaxed">
                    Your ChatGPT admin switches it on for the whole workspace. <CopyAdminMessage />
                </p>
            ) : (
                <SettingPath />
            )}
            <button type="button" onClick={onToggle} className="w-fit underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground">
                {workspacePlan ? 'I’m on Plus or Pro' : 'On ChatGPT Business or Enterprise?'}
            </button>
        </div>
    )
}

function SettingPath() {
    return (
        <ol aria-label="Where the setting is in ChatGPT" className="flex flex-wrap items-center gap-1">
            {SETTING_PATH.map((segment, index) => (
                <li key={segment} className="flex min-w-0 items-center gap-1">
                    {index > 0 && <ChevronRightIcon className="size-3 shrink-0" />}
                    <span className={cn('rounded-md bg-muted px-1.5 py-0.5', index === SETTING_PATH.length - 1 && 'font-medium text-foreground')}>{segment}</span>
                </li>
            ))}
        </ol>
    )
}

function CodeStep({ auth, primary, stuck, workspacePlan }: { auth: CodexDeviceAuth; primary: boolean; stuck: boolean; workspacePlan: boolean }) {
    if (auth.phase === 'connected') return null

    return (
        <div className="flex flex-col gap-2">
            {auth.pending ? (
                <>
                    <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-1.5 pl-4">
                        <code className="min-w-0 flex-1 truncate font-mono text-lg font-medium tracking-[0.2em]">{auth.pending.userCode}</code>
                        <Button type="button" size="icon" variant="ghost" onClick={auth.copy} aria-label="Copy code">
                            {auth.copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                        </Button>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Enter it on <InlineLink href={auth.pending.verificationUrl}>OpenAI&apos;s page</InlineLink> and approve. This window picks it up on its own.
                    </p>
                </>
            ) : (
                <TooltipDisabledReason reason={auth.opening && auth.phase !== 'starting' ? 'OpenAI is opening in a new tab' : undefined} className="self-start">
                    <Button type="button" variant={primary ? 'default' : 'outline'} onClick={auth.start} disabled={auth.phase === 'starting' || auth.opening} className="gap-1.5 self-start">
                        <ProviderIcon provider="codex" className="size-3.5" />
                        {auth.phase === 'starting' ? 'Getting code…' : auth.expired ? 'Get a new code' : 'Get code'}
                    </Button>
                </TooltipDisabledReason>
            )}
            {stuck ? <StuckHint expired={auth.expired} workspacePlan={workspacePlan} /> : <StepError error={auth.error} />}
        </div>
    )
}

function StuckHint({ expired, workspacePlan }: { expired: boolean; workspacePlan: boolean }) {
    return (
        <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            <span className="min-w-0">
                {expired ? 'The code expired. ' : 'Error on OpenAI’s page? '}
                {workspacePlan ? (
                    <>
                        Your admin has probably not allowed sign-in by code yet. <CopyAdminMessage />
                    </>
                ) : (
                    <>
                        Sign-in by code is probably still off: turn it on in <InlineLink href={CHATGPT_SECURITY_URL}>Settings → Security</InlineLink>, then {expired ? 'get a new code' : 'enter the code again'}.
                    </>
                )}
            </span>
        </p>
    )
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline">
            {children}
            <ExternalLinkIcon className="size-3" />
        </a>
    )
}

function CopyAdminMessage() {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        void navigator.clipboard.writeText(ADMIN_MESSAGE)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline">
            {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
            {copied ? 'Copied' : 'Copy a message for them'}
        </button>
    )
}
