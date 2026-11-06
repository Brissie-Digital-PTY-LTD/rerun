import type { AiConnectionView, AiConnectionsView } from '@rerun/contracts'
import { Fragment, useState, type ReactNode } from 'react'
import { Switch, View } from 'react-native'

import { AppText } from '@/components/ui/AppText'
import { TONES } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, GROUPED_ROW_HEIGHT, Section, SectionTitle, Separator, SettingsRow } from '@/components/ui/GroupedList'
import { TextField } from '@/components/ui/TextField'
import { useTheme } from '@/theme/theme'
import { fonts, radius, spacing, withAlpha } from '@/theme/tokens'

import { ConnectionBadge, ErrorLine, LogoTile, ReadOnlyNote, SheetFrame, UsageBar } from './bits'
import { signsIn } from './routes'

type ConnectionDetailProps = {
    connection: AiConnectionView
    view: AiConnectionsView
    error: string | null
    onBack: () => void
    onRename: () => void
    onModels: (models: string[]) => void
    onBaseUrl: (baseUrl: string) => void
    onExtraModels: (extraModels: string[]) => void
    onSignInAgain: () => void
    replacement: { key: string; onKey: (key: string) => void; busy: boolean; error: string | null; onSave: () => void }
    onRemove: () => void
    // Why the caller can only read the connection (a member), or null when they run it.
    readOnlyReason?: string | null
}

// The web's ConnectionDetail: what is wrong first, then the plan's usage, the models, OpenRouter's
// router, and the delete at the very bottom. Every edit persists at once.
export function ConnectionDetail({ connection, view, error, onBack, onRename, onModels, onBaseUrl, onExtraModels, onSignInAgain, replacement, onRemove, readOnlyReason }: ConnectionDetailProps) {
    const readOnly = !!readOnlyReason
    const isRerun = connection.kind === 'included'
    const isOpenRouter = connection.provider === 'openrouter'
    return (
        <SheetFrame title={connection.name} onBack={onBack}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <LogoTile provider={connection.provider} />
                <AppText variant="callout" tone="muted" numberOfLines={2} style={{ flex: 1 }}>
                    {connection.summary}
                </AppText>
                <View style={{ alignSelf: 'center' }}>
                    <ConnectionBadge connection={connection} />
                </View>
            </View>

            <ReadOnlyNote reason={readOnlyReason} />
            <ErrorLine error={error} />

            {isRerun ? <CreditBlock view={view} /> : connection.status === 'reconnect' && <ReconnectBlock connection={connection} readOnly={readOnly} onSignInAgain={onSignInAgain} replacement={replacement} />}

            {connection.kind === 'plan' && connection.status === 'connected' && <PlanUsage connection={connection} />}

            {!isRerun && (
                <Section>
                    <SettingsRow label="Name" value={connection.name} disabled={readOnly} onPress={onRename} />
                </Section>
            )}

            <Models connection={connection} defaultModel={view.default.connectionId === connection.id ? view.default.model : null} readOnly={readOnly} onModels={onModels} />

            {isOpenRouter && <BaseUrl baseUrl={connection.baseUrl} readOnly={readOnly} onCommit={onBaseUrl} />}
            {isOpenRouter && connection.credentialOnFile && <CustomModels connection={connection} readOnly={readOnly} onChange={onExtraModels} />}

            {!isRerun && <Button label={`Remove ${connection.name}`} symbol="trash" variant="destructive" disabled={readOnly} onPress={onRemove} />}
        </SheetFrame>
    )
}

function Notice({ tone, children }: { tone: 'orange' | 'red'; children: ReactNode }) {
    const theme = useTheme()
    const color = TONES[tone][theme.scheme]
    return <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: withAlpha(color, 0.3), backgroundColor: withAlpha(color, theme.scheme === 'dark' ? 0.1 : 0.06) }}>{children}</View>
}

// No Top up here: the app sells nothing.
function CreditBlock({ view }: { view: AiConnectionsView }) {
    const body = (
        <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <AppText variant="callout" medium>
                    This month's credits
                </AppText>
                <AppText variant="footnote" tone="muted">
                    {view.credit.percent}%
                </AppText>
            </View>
            <UsageBar percent={view.credit.percent} />
            <AppText variant="footnote" tone="muted">
                {view.credit.usedUp ? `Coworkers running on Rerun are paused until the credits are back ${view.credit.backOn}. Pick another default model to keep them going.` : 'Comes with your Rerun plan. No key, nothing to set up.'}
            </AppText>
        </>
    )
    if (view.credit.usedUp) return <Notice tone="red">{body}</Notice>
    return (
        <Card>
            <View style={{ gap: spacing.md, padding: spacing.lg }}>{body}</View>
        </Card>
    )
}

function ReconnectBlock({ connection, readOnly, onSignInAgain, replacement }: { connection: AiConnectionView; readOnly: boolean; onSignInAgain: () => void; replacement: ConnectionDetailProps['replacement'] }) {
    if (signsIn(connection.provider)) {
        return (
            <Notice tone="orange">
                <AppText variant="callout">{connection.credentialOnFile ? 'This sign-in was rejected. Coworkers using it are stopped until you sign in again.' : 'This sign-in expired. Coworkers using it are stopped until you sign in again.'}</AppText>
                <View style={{ alignSelf: 'flex-start' }}>
                    <Button label="Sign in again" disabled={readOnly} onPress={onSignInAgain} />
                </View>
            </Notice>
        )
    }
    return (
        <Notice tone="orange">
            <AppText variant="callout">{connection.credentialOnFile ? 'This key was rejected. Coworkers using it are stopped until you paste a new one.' : 'No key on file. Coworkers using it are stopped until you paste one.'}</AppText>
            <TextField id="replace-key" label="API key" value={replacement.key} onChangeText={replacement.onKey} placeholder="Paste your key" secret disabled={readOnly} />
            <View style={{ alignSelf: 'flex-start' }}>
                <Button label="Save" onPress={replacement.onSave} disabled={readOnly || !replacement.key.trim()} loading={replacement.busy} />
            </View>
            <ErrorLine error={replacement.error} />
        </Notice>
    )
}

function PlanUsage({ connection }: { connection: AiConnectionView }) {
    return (
        <View style={{ gap: spacing.sm }}>
            <SectionTitle>Plan usage</SectionTitle>
            <Card>
                {connection.planWindows.length === 0 ? (
                    <AppText variant="footnote" tone="muted" style={{ padding: spacing.lg }}>
                        Usage shows up here after the next run on this plan.
                    </AppText>
                ) : (
                    connection.planWindows.map((window, index) => (
                        <Fragment key={window.name}>
                            {index > 0 && <Separator />}
                            <View style={{ gap: spacing.sm, padding: spacing.lg }}>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                                    <AppText variant="callout" numberOfLines={1} style={{ flex: 1 }}>
                                        {window.name}
                                    </AppText>
                                    <AppText variant="footnote" tone="muted" numberOfLines={1}>
                                        {[`${Math.round(window.usedPercent)}%`, window.reset].filter(Boolean).join(' · ')}
                                    </AppText>
                                </View>
                                <UsageBar percent={window.usedPercent} />
                            </View>
                        </Fragment>
                    ))
                )}
            </Card>
        </View>
    )
}

// The web's ModelBuckets as switches, with its three locks: the default model, a custom one (removed
// below), and the last one left on.
function Models({ connection, defaultModel, readOnly, onModels }: { connection: AiConnectionView; defaultModel: string | null; readOnly: boolean; onModels: (models: string[]) => void }) {
    const theme = useTheme()
    const enabled = connection.models.filter(model => model.enabled)
    const switchable = connection.kind !== 'included' && connection.models.length > 1
    if (!switchable && enabled.length <= 1) return null

    const lockReason = (id: string) => {
        if (id === defaultModel) return 'Default model'
        if (connection.extraModels.includes(id)) return 'Custom model. Remove it below.'
        if (enabled.length === 1) return 'Coworkers need at least one model from this source.'
        return undefined
    }
    const catalogEnabled = connection.models.filter(model => model.enabled && !connection.extraModels.includes(model.id)).map(model => model.id)
    const toggle = (id: string, on: boolean) => onModels(on ? [...catalogEnabled, id] : catalogEnabled.filter(model => model !== id))

    return (
        <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg }}>
                <AppText variant="footnote" tone="muted" medium>
                    Your coworkers can use
                </AppText>
                {switchable && (
                    <AppText variant="footnote" tone="muted">
                        {enabled.length} of {connection.models.length}
                    </AppText>
                )}
            </View>
            <Card>
                {(switchable ? connection.models : enabled).map((model, index) => {
                    const reason = model.enabled ? lockReason(model.id) : undefined
                    return (
                        <Fragment key={model.id}>
                            {index > 0 && <Separator />}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: GROUPED_ROW_HEIGHT, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <AppText variant="body" numberOfLines={1} style={connection.extraModels.includes(model.id) ? { fontFamily: fonts.mono, fontSize: 14 } : undefined}>
                                        {model.label}
                                    </AppText>
                                    {(reason ?? model.description) ? (
                                        <AppText variant="footnote" tone="muted" numberOfLines={2}>
                                            {reason ?? model.description}
                                        </AppText>
                                    ) : null}
                                </View>
                                {switchable && <Switch testID={`model-${model.id}`} value={model.enabled} disabled={readOnly || reason !== undefined} onValueChange={on => toggle(model.id, on)} trackColor={{ true: TONES.brand[theme.scheme] }} />}
                            </View>
                        </Fragment>
                    )
                })}
            </Card>
        </View>
    )
}

function BaseUrl({ baseUrl, readOnly, onCommit }: { baseUrl: string; readOnly: boolean; onCommit: (baseUrl: string) => void }) {
    const [value, setValue] = useState(baseUrl)
    const changed = value.trim() !== baseUrl
    return (
        <View style={{ gap: spacing.sm }}>
            <TextField id="base-url" label="Custom base URL" help="Send requests to your own OpenRouter-compatible router" value={value} onChangeText={setValue} placeholder="https://router.example.com/api/v1" verbatim disabled={readOnly} />
            {changed && (
                <View style={{ alignSelf: 'flex-start' }}>
                    <Button label="Save" size="sm" onPress={() => onCommit(value.trim())} />
                </View>
            )}
        </View>
    )
}

function CustomModels({ connection, readOnly, onChange }: { connection: AiConnectionView; readOnly: boolean; onChange: (extraModels: string[]) => void }) {
    const [draft, setDraft] = useState('')
    const reserved = connection.models.filter(model => !connection.extraModels.includes(model.id)).map(model => model.id)
    const value = draft.trim()
    const add = () => {
        if (!value || connection.extraModels.includes(value) || reserved.includes(value)) return
        onChange([...connection.extraModels, value])
        setDraft('')
    }
    return (
        <View style={{ gap: spacing.sm }}>
            <SectionTitle>Custom models</SectionTitle>
            {connection.extraModels.length > 0 && (
                <Card>
                    {connection.extraModels.map((id, index) => (
                        <Fragment key={id}>
                            {index > 0 && <Separator />}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: GROUPED_ROW_HEIGHT, paddingLeft: spacing.lg, paddingRight: spacing.sm }}>
                                <AppText numberOfLines={1} style={{ flex: 1, fontFamily: fonts.mono, fontSize: 14 }}>
                                    {id}
                                </AppText>
                                <Button label="Remove" size="sm" variant="ghost" disabled={readOnly} onPress={() => onChange(connection.extraModels.filter(model => model !== id))} />
                            </View>
                        </Fragment>
                    ))}
                </Card>
            )}
            <TextField id="custom-model" label="Add a model" help="Any OpenRouter model id, e.g. x-ai/grok-4." value={draft} onChangeText={setDraft} placeholder="vendor/model" verbatim disabled={readOnly} />
            {value !== '' && (
                <View style={{ alignSelf: 'flex-start' }}>
                    <Button label="Add" size="sm" variant="outline" onPress={add} />
                </View>
            )}
        </View>
    )
}
