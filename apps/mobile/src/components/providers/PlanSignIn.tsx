import * as Clipboard from 'expo-clipboard'
import { SymbolView } from 'expo-symbols'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { AppText } from '@/components/ui/AppText'
import { TONES } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProviderLogo } from '@/components/ui/ProviderLogo'
import { TextField } from '@/components/ui/TextField'
import { useTheme } from '@/theme/theme'
import { fonts, radius, spacing } from '@/theme/tokens'

import { ErrorLine, SheetFrame, StepTrack, type TrackStep } from './bits'

// Same constants as apps/ui/components/connections/plan-connect/chatgpt-setup.ts.
export const CHATGPT_SECURITY_URL = 'https://chatgpt.com/#settings/Security'
const SETTING_PATH = ['Settings', 'Security', 'Enable device code authorization for Codex']
const ADMIN_MESSAGE = `Hi! Could you turn on "Device code authorization for Codex" in our ChatGPT workspace settings? I need it to connect my ChatGPT plan to Rerun.`

// Adding a plan ends on its name; signing one in again ends on the coworkers starting again.
export type SignInEnding = { kind: 'name'; name: string; placeholder: string; onName: (name: string) => void; onDone: () => void; saving: boolean; error: string | null } | { kind: 'reconnect' }

function lastStep(ending: SignInEnding, linked: boolean): TrackStep {
    if (ending.kind === 'reconnect') return { title: 'Your coworkers start again' }
    const canFinish = linked && !ending.saving && ending.name.trim() !== ''
    return {
        title: 'Name it',
        body: (
            <View style={{ gap: spacing.sm }}>
                <TextField id="connection-name" label="Connection name" help="Shown in every coworker's model picker." value={ending.name} onChangeText={ending.onName} placeholder={ending.placeholder} />
                <View style={{ alignSelf: 'flex-start' }}>
                    <Button label={ending.saving ? 'Saving…' : 'Done'} onPress={ending.onDone} disabled={!canFinish} loading={ending.saving} />
                </View>
                <ErrorLine error={ending.error} />
            </View>
        ),
    }
}

export type ClaudePhase = 'idle' | 'waiting' | 'checking' | 'connected'

type ClaudeSignInProps = {
    phase: ClaudePhase
    error: string | null
    code: string
    onCode: (code: string) => void
    onOpenClaude: () => void
    onPaste: () => void
    onSubmit: () => void
    ending: SignInEnding
    onBack: () => void
}

// The web's ClaudePlanSteps: approve on Claude, paste back what it shows. The field also takes a
// `claude setup-token` token pasted by hand.
export function ClaudeSignIn({ phase, error, code, onCode, onOpenClaude, onPaste, onSubmit, ending, onBack }: ClaudeSignInProps) {
    const opened = phase !== 'idle'
    const busy = phase === 'checking'
    const linked = phase === 'connected'
    return (
        <SheetFrame title="Claude" onBack={onBack}>
            <StepTrack
                at={linked ? 2 : opened ? 1 : 0}
                done={linked ? 3 : opened ? 1 : 0}
                steps={[
                    {
                        title: 'Approve Rerun on Claude',
                        body: (
                            <View style={{ alignSelf: 'flex-start' }}>
                                <Button label={opened ? 'Open Claude again' : 'Open Claude'} variant={opened ? 'outline' : 'default'} icon={<ProviderLogo provider="claude" size={16} />} onPress={onOpenClaude} disabled={busy || linked} />
                            </View>
                        ),
                    },
                    {
                        title: 'Paste the code',
                        body: (
                            <View style={{ gap: spacing.sm }}>
                                <TextField id="claude-code" label="Code from Claude" value={code} onChangeText={onCode} placeholder={busy ? 'Checking the code…' : 'Code from Claude'} secret />
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                                    <Button label="Paste" symbol="doc.on.clipboard" variant={code.trim() ? 'outline' : 'default'} onPress={onPaste} disabled={busy} />
                                    {code.trim() !== '' && <Button label="Connect" onPress={onSubmit} loading={busy} />}
                                </View>
                                <ErrorLine error={error} />
                            </View>
                        ),
                    },
                    lastStep(ending, linked),
                ]}
            />
        </SheetFrame>
    )
}

export type ChatGptPhase = 'idle' | 'starting' | 'waiting' | 'connected'

type ChatGptSignInProps = {
    phase: ChatGptPhase
    pending: { userCode: string; verificationUrl: string } | null
    expired: boolean
    stuck: boolean
    error: string | null
    onGetCode: () => void
    // Called as OpenAI's page opens, before the browser covers the code.
    onOpenVerification?: () => void
    ending: SignInEnding
    onBack: () => void
}

// The web's ChatGptPlanSteps. OpenAI only takes the device code once the account allows it, and
// nothing says it is off: the approval just never comes. So the switch comes first.
export function ChatGptSignIn({ phase, pending, expired, stuck, error, onGetCode, onOpenVerification, ending, onBack }: ChatGptSignInProps) {
    const [settingsOpened, setSettingsOpened] = useState(false)
    const [workspacePlan, setWorkspacePlan] = useState(false)
    const linked = phase === 'connected'
    const onCode = settingsOpened || phase !== 'idle' || expired || error !== null

    const openSettings = () => {
        setSettingsOpened(true)
        WebBrowser.openBrowserAsync(CHATGPT_SECURITY_URL)
    }

    return (
        <SheetFrame title="ChatGPT" onBack={onBack}>
            <StepTrack
                at={linked ? 2 : onCode ? 1 : 0}
                done={linked ? 3 : onCode ? 1 : 0}
                steps={[
                    {
                        title: 'Allow sign-in by code in ChatGPT',
                        body: (
                            <View style={{ gap: spacing.md }}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                                    <Button label="Open ChatGPT settings" symbol="arrow.up.right" onPress={openSettings} />
                                    <Button label="It's already on" symbol="checkmark" variant="outline" onPress={onGetCode} />
                                </View>
                                {workspacePlan ? (
                                    <AppText variant="footnote" tone="muted">
                                        Your ChatGPT admin switches it on for the whole workspace. <CopyAdminMessage />
                                    </AppText>
                                ) : (
                                    <SettingPath />
                                )}
                                <AppText variant="footnote" tone="muted" style={{ textDecorationLine: 'underline' }} onPress={() => setWorkspacePlan(value => !value)}>
                                    {workspacePlan ? 'I’m on Plus or Pro' : 'On ChatGPT Business or Enterprise?'}
                                </AppText>
                            </View>
                        ),
                    },
                    { title: 'Enter the code on OpenAI', body: <CodeStep phase={phase} pending={pending} expired={expired} stuck={stuck} error={error} workspacePlan={workspacePlan} onGetCode={onGetCode} onOpenVerification={onOpenVerification} /> },
                    lastStep(ending, linked),
                ]}
            />
        </SheetFrame>
    )
}

function SettingPath() {
    const theme = useTheme()
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
            {SETTING_PATH.map((segment, index) => (
                <View key={segment} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' }}>
                    {index > 0 && <SymbolView name="chevron.right" size={10} weight="semibold" tintColor={theme.mutedForeground} />}
                    <View style={{ flexShrink: 1, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: theme.muted }}>
                        <AppText variant="caption" medium={index === SETTING_PATH.length - 1} tone={index === SETTING_PATH.length - 1 ? 'default' : 'muted'}>
                            {segment}
                        </AppText>
                    </View>
                </View>
            ))}
        </View>
    )
}

function CopyAdminMessage() {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        Clipboard.setStringAsync(ADMIN_MESSAGE)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <AppText variant="footnote" medium onPress={copy} style={{ textDecorationLine: 'underline' }}>
            {copied ? 'Copied' : 'Copy a message for them'}
        </AppText>
    )
}

type CodeStepProps = { phase: ChatGptPhase; pending: ChatGptSignInProps['pending']; expired: boolean; stuck: boolean; error: string | null; workspacePlan: boolean; onGetCode: () => void; onOpenVerification?: () => void }

function CodeStep({ phase, pending, expired, stuck, error, workspacePlan, onGetCode, onOpenVerification }: CodeStepProps) {
    const theme = useTheme()
    const [copied, setCopied] = useState(false)
    if (phase === 'connected') return null

    const copy = () => {
        if (!pending) return
        Clipboard.setStringAsync(pending.userCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <View style={{ gap: spacing.md }}>
            {pending && !expired ? (
                <>
                    <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel="Copy code" testID="codex-code" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', paddingVertical: spacing.md, paddingLeft: spacing.lg, paddingRight: spacing.md, backgroundColor: pressed ? theme.secondary : theme.muted })}>
                        <AppText numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={{ flex: 1, fontFamily: fonts.mono, fontSize: 22, lineHeight: 28, letterSpacing: 4, color: theme.foreground }}>
                            {pending.userCode}
                        </AppText>
                        <SymbolView name={copied ? 'checkmark' : 'doc.on.doc'} size={17} tintColor={theme.foreground} />
                    </Pressable>
                    <View style={{ alignSelf: 'flex-start' }}>
                        <Button label="Open OpenAI" icon={<ProviderLogo provider="codex" size={16} color={theme.primaryForeground} />} onPress={() => {
                                onOpenVerification?.()
                                WebBrowser.openBrowserAsync(pending.verificationUrl)
                            }}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <ActivityIndicator size="small" color={theme.mutedForeground} />
                        <AppText variant="footnote" tone="muted" style={{ flex: 1 }}>
                            Enter it on OpenAI's page and approve. This screen picks it up on its own.
                        </AppText>
                    </View>
                </>
            ) : (
                <View style={{ alignSelf: 'flex-start' }}>
                    <Button label={phase === 'starting' ? 'Getting code…' : expired ? 'Get a new code' : 'Get code'} icon={<ProviderLogo provider="codex" size={16} color={theme.primaryForeground} />} onPress={onGetCode} loading={phase === 'starting'} />
                </View>
            )}
            {stuck ? <StuckHint expired={expired} workspacePlan={workspacePlan} /> : <ErrorLine error={error} />}
        </View>
    )
}

function StuckHint({ expired, workspacePlan }: { expired: boolean; workspacePlan: boolean }) {
    const theme = useTheme()
    return (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <SymbolView name="exclamationmark.triangle" size={14} tintColor={TONES.yellow[theme.scheme]} style={{ marginTop: 2 }} />
            <AppText variant="footnote" tone="muted" style={{ flex: 1 }}>
                {expired ? 'The code expired. ' : 'Error on OpenAI’s page? '}
                {workspacePlan ? (
                    <>
                        Your admin has probably not allowed sign-in by code yet. <CopyAdminMessage />
                    </>
                ) : (
                    <>
                        Sign-in by code is probably still off: turn it on in{' '}
                        <AppText variant="footnote" medium style={{ textDecorationLine: 'underline' }} onPress={() => WebBrowser.openBrowserAsync(CHATGPT_SECURITY_URL)}>
                            Settings → Security
                        </AppText>
                        , then {expired ? 'get a new code' : 'enter the code again'}.
                    </>
                )}
            </AppText>
        </View>
    )
}
