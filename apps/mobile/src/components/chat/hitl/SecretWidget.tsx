import { HITL_CANCELLED, pendingSecrets, serializeSecretResult } from '@rerun/contracts'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'

import { fetchAgentKeys, saveAgentKeys } from '@/api/agent-keys'
import { useAuth } from '@/auth/AuthProvider'
import { AppText } from '@/components/ui/AppText'
import { TextField } from '@/components/ui/TextField'
import { hostOf, openExternalUrl } from '@/lib/url'
import { spacing } from '@/theme/tokens'

import { HitlAction, HitlCard } from './HitlCard'
import type { HitlWidgetProps } from './registry'

// The keys a coworker needs, written straight onto the Box as its variables: the hub passes them on
// and the model never sees a value, only that it was provided.
export function SecretWidget({ pending, agentId, onAnswer, onDismiss }: HitlWidgetProps) {
    const { session, me } = useAuth()
    const caller = session && me ? { accessToken: session.access_token, workspaceId: me.workspace.id } : null
    const secrets = pendingSecrets(pending.input)
    const [values, setValues] = useState<Record<string, string>>({})
    const [saved, setSaved] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const sent = useRef(false)
    const accessToken = session?.access_token
    const workspaceId = me?.workspace.id

    useEffect(() => {
        if (!accessToken || !workspaceId) return
        fetchAgentKeys({ accessToken, workspaceId }, agentId)
            .then(list => setSaved(list.keys))
            .catch(() => {})
    }, [accessToken, workspaceId, agentId])

    const answer = (text: string) => {
        if (sent.current) return
        sent.current = true
        onAnswer(text)
    }

    const filled = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value))

    const save = async () => {
        if (!caller || Object.keys(filled).length === 0) return
        setSaving(true)
        setError(null)
        try {
            await saveAgentKeys(caller, agentId, filled)
            answer(serializeSecretResult(secrets, Object.keys(filled)))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the credentials')
        } finally {
            setSaving(false)
        }
    }

    const reason = typeof pending.input.reason === 'string' ? pending.input.reason : null

    return (
        <HitlCard symbol="lock" label={secrets.length > 1 ? 'Credentials needed' : 'Credential needed'} onClose={onDismiss} closeLabel="Dismiss credential request">
            {reason && <AppText variant="body">{reason}</AppText>}
            {secrets.map(secret => (
                <View key={secret.key} style={{ gap: spacing.xs }}>
                    <TextField id={secret.key} label={secret.label} help={[secret.help, `Stored as ${secret.key}`].filter(Boolean).join(' · ')} value={values[secret.key] ?? ''} onChangeText={text => setValues(current => ({ ...current, [secret.key]: text }))} placeholder={saved.includes(secret.key) ? 'Already saved. Type to replace it' : 'Paste the value'} secret />
                    {secret.docsUrl && hostOf(secret.docsUrl) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <HitlAction label="Where to find it" onPress={() => openExternalUrl(secret.docsUrl!)} />
                            <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                                {hostOf(secret.docsUrl)}
                            </AppText>
                        </View>
                    )}
                </View>
            ))}
            {error && (
                <AppText variant="footnote" tone="destructive">
                    {error}
                </AppText>
            )}
            <AppText variant="footnote" tone="muted">
                Stored on your Box as a coworker variable. Never sent to the model.
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm }}>
                <HitlAction label="Skip" onPress={() => answer(HITL_CANCELLED.secret)} />
                <HitlAction label={saving ? 'Saving…' : 'Save'} primary disabled={saving || Object.keys(filled).length === 0} onPress={save} />
            </View>
        </HitlCard>
    )
}
