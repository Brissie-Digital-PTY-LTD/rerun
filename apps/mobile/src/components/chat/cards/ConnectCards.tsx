import type { McpRegisterCard, McpServerView, ResolvedService } from '@rerun/contracts'
import { Image } from 'expo-image'
import { useEffect, useState } from 'react'

import { readMcpServer } from '@/api/mcp'
import { readService } from '@/api/services'
import { useAuth } from '@/auth/AuthProvider'
import { AppText } from '@/components/ui/AppText'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { runConnect, runMcpConnect } from '@/lib/oauth-connect'
import { hostOf } from '@/lib/url'

import type { ConnectCard } from './cards'
import { EventRow } from './EventCardView'

function useCaller() {
    const { session, me } = useAuth()
    return session && me ? { accessToken: session.access_token, workspaceId: me.workspace.id } : null
}

// The app's logo in the card's tile, or nothing and the tile keeps its glyph.
function logoOf(uri: string | null | undefined) {
    return uri?.startsWith('http') ? <Image source={{ uri }} contentFit="contain" style={{ width: 20, height: 20 }} /> : undefined
}

const humanize = (name: string) =>
    name
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase())

// The tool output is frozen at the time of the call, so whether the sign-in is still owed is asked
// again: an old card in the history must not keep offering a connection made since.
function NeedsAuthCard({ agentId, slug, name }: { agentId: string; slug: string; name: string }) {
    const caller = useCaller()
    const [service, setService] = useState<ResolvedService | null>(null)
    const [connected, setConnected] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const accessToken = caller?.accessToken
    const workspaceId = caller?.workspaceId

    useEffect(() => {
        if (!accessToken || !workspaceId) return
        let alive = true
        readService({ accessToken, workspaceId }, agentId, slug)
            .then(found => alive && setService(found))
            .catch(() => {})
        return () => {
            alive = false
        }
    }, [accessToken, workspaceId, agentId, slug])

    const done = connected || service?.installStatus === 'active'
    const pending = service?.installStatus === 'needs_auth' && !connected

    const connect = async () => {
        if (!caller) return
        setBusy(true)
        setError(null)
        const outcome = await runConnect(caller, agentId, slug)
        setBusy(false)
        if (outcome.status === 'connected') setConnected(true)
        else if (outcome.status === 'error') setError(outcome.message)
    }

    return (
        <EventRow
            symbol="link"
            icon={logoOf(service?.icon)}
            title={`${name} added`}
            note={error ?? (done ? 'Connected, the coworker can use it' : 'Sign in once so the coworker can use it')}
            trailing={done ? <Badge size="xs" tone="green" label="Connected" /> : pending ? <Button size="sm" variant="outline" label={busy ? 'Signing in…' : 'Sign in'} symbol="person.crop.circle.badge.checkmark" loading={busy} onPress={connect} /> : undefined}
        />
    )
}

function McpStatusBadge({ status }: { status: McpServerView['status'] }) {
    if (status === 'connected') return <Badge size="xs" tone="green" label="Connected" />
    if (status === 'needs_auth') return <Badge size="xs" tone="orange" label="Sign-in needed" />
    if (status === 'error') return <Badge size="xs" tone="red" label="Unreachable" />
    return null
}

// The tool output is frozen at the time of the call, so the server is looked up again: an old card
// follows the sign-in made since, and shows no status once the server is gone.
function McpServerCard({ agentId, card }: { agentId: string; card: McpRegisterCard }) {
    const caller = useCaller()
    const [server, setServer] = useState<McpServerView | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const accessToken = caller?.accessToken
    const workspaceId = caller?.workspaceId
    const saved = card.outcome === 'saved'

    useEffect(() => {
        if (!saved || !accessToken || !workspaceId) return
        let alive = true
        readMcpServer({ accessToken, workspaceId }, agentId, card.name)
            .then(found => alive && setServer(found))
            .catch(() => {})
        return () => {
            alive = false
        }
    }, [saved, accessToken, workspaceId, agentId, card.name])

    const displayName = server?.displayName ?? humanize(card.name)

    if (!saved) {
        return <EventRow symbol="link" title={`Couldn't connect ${displayName}`} note={card.failure} trailing={<Badge size="xs" tone="red" label="Not added" />} />
    }

    const host = server?.host ?? hostOf(card.url)
    const connect = async () => {
        if (!caller) return
        setBusy(true)
        setError(null)
        const outcome = await runMcpConnect(caller, agentId, card.name)
        setBusy(false)
        if (outcome.status === 'connected') setServer(current => current && { ...current, status: 'connected' })
        else if (outcome.status === 'error') setError(outcome.message)
    }
    const canSignIn = server?.status === 'needs_auth' && server.canSignIn

    return (
        <EventRow
            symbol="link"
            icon={logoOf(server?.icon)}
            title={`${displayName} added`}
            note={error ?? (host ? `Custom MCP server · ${host}` : 'Custom MCP server')}
            trailing={canSignIn ? <Button size="sm" variant="outline" label={busy ? 'Connecting…' : 'Connect'} symbol="person.crop.circle.badge.checkmark" loading={busy} onPress={connect} /> : server ? <McpStatusBadge status={server.status} /> : undefined}
        />
    )
}

export function ConnectCardView({ card, agentId }: { card: ConnectCard; agentId: string }) {
    switch (card.kind) {
        case 'service-installed':
            return (
                <EventRow symbol="checkmark.circle" title={`${card.name} installed`}>
                    {card.toolNames.length > 0 && (
                        <AppText variant="footnote" tone="muted">
                            {`Available on the next turn: ${card.toolNames.join(', ')}`}
                        </AppText>
                    )}
                </EventRow>
            )
        case 'service-needs-auth':
            return <NeedsAuthCard agentId={agentId} slug={card.slug} name={card.name} />
        case 'mcp-server':
            return <McpServerCard agentId={agentId} card={card.card} />
    }
}
