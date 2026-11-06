'use client'

import { updateAgentKeysAction } from '@/app/api/_actions/agent.actions'
import { McpVarTextarea } from '@/components/agent/McpVarTextarea'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PanelDeleteButton, PanelEditorBody, PanelEditorFooter, PanelEditorHeader, PanelEditorShell } from '@/components/ui/panel-editor'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import { useAgentVariables } from '@/hooks/useAgentVariables'
import { useCanManageAgent } from '@/hooks/useBoxAccess'
import { BOX_MANAGE_REASON } from '@/lib/board/box-access'
import { argsHaveSecret, externalizeArgs, externalizePairs, externalizeUrl, sanitize, urlHasSecret } from '@/lib/engine/mcp-secrets'
import type { EngineMcpServer } from '@/lib/engine/types'
import { MCP_SERVER_NAME_RE } from '@rerun/contracts'
import { useCallback, useMemo, useState } from 'react'

const parseArgs = (text: string): string[] => text.split('\n').map(a => a.trim()).filter(Boolean)

function parsePairs(text: string): Record<string, string> {
    const out: Record<string, string> = {}
    for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const eq = trimmed.indexOf('=')
        if (eq > 0) out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
    return out
}

const SECRET_WARNING = 'A secret was detected here. It moves to the engine and becomes a ${NAME} when you save.'

export function McpServerEditor({
    agentId,
    server,
    readOnly,
    onSave,
    onDelete,
    onDone,
    onBack,
}: {
    agentId: string
    server?: EngineMcpServer
    readOnly?: boolean
    onSave: (server: EngineMcpServer) => Promise<{ success: boolean; error?: string }>
    onDelete?: () => Promise<{ success: boolean; error?: string }>
    onDone: () => void
    onBack: () => void
}) {
    const isEdit = !!server
    const [name, setName] = useState(server?.name ?? '')
    const [transport, setTransport] = useState<'stdio' | 'sse' | 'http'>(server?.transport ?? 'stdio')
    const [command, setCommand] = useState(server?.command ?? '')
    const [argsText, setArgsText] = useState((server?.args ?? []).join('\n'))
    const [url, setUrl] = useState(server?.url ?? '')
    const [envText, setEnvText] = useState(
        Object.entries(server?.env ?? {})
            .map(([k, v]) => `${k}=${v}`)
            .join('\n'),
    )
    const [headersText, setHeadersText] = useState(
        Object.entries(server?.headers ?? {})
            .map(([k, v]) => `${k}=${v}`)
            .join('\n'),
    )
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const vars = useAgentVariables(agentId)
    const canManage = useCanManageAgent(agentId)
    const manageReason = canManage ? undefined : BOX_MANAGE_REASON
    // `readOnly` is a server an app owns, with no footer at all. A use-only member keeps the footer, disabled, to read why.
    const fieldsLocked = readOnly || !canManage

    const handleSave = useCallback(async () => {
        setSaving(true)
        setError(null)

        const serverName = name.trim()
        if (!MCP_SERVER_NAME_RE.test(serverName)) {
            setSaving(false)
            setError('Name must be 1-64 characters: letters, digits, underscores, or hyphens.')
            return
        }
        const isStdio = transport === 'stdio'
        const stdioArgs = isStdio ? externalizeArgs(parseArgs(argsText), serverName) : null
        const httpUrl = isStdio ? null : externalizeUrl(url.trim(), serverName)
        const env = externalizePairs(parsePairs(envText))
        const headers = isStdio ? null : externalizePairs(parsePairs(headersText), `MCP_${sanitize(serverName)}_`)
        const keysSet: Record<string, string> = { ...stdioArgs?.keys, ...httpUrl?.keys, ...env.keys, ...headers?.keys }

        const next: EngineMcpServer = {
            name: serverName,
            transport,
            args: stdioArgs?.value ?? [],
            env: env.value,
            headers: headers?.value ?? (isStdio ? (server?.headers ?? {}) : {}),
            ...(isStdio ? { command: command.trim() || undefined } : { url: httpUrl?.value || undefined }),
        }

        if (Object.keys(keysSet).length > 0) {
            const keysResult = await updateAgentKeysAction(agentId, { set: keysSet })
            if (!keysResult.success) {
                setSaving(false)
                setError(keysResult.error ?? 'Failed to store credentials')
                return
            }
            vars.markDefined(Object.keys(keysSet))
        }

        const result = await onSave(next)
        setSaving(false)
        if (result.success) onDone()
        else setError(result.error ?? 'Failed to save')
    }, [agentId, name, transport, command, argsText, url, envText, headersText, server, vars, onSave, onDone])

    const handleDelete = useCallback(async () => {
        if (!onDelete) return
        setDeleting(true)
        const result = await onDelete()
        setDeleting(false)
        if (result.success) onDone()
        else setError(result.error ?? 'Failed to delete')
    }, [onDelete, onDone])

    const canSave = name.trim() && (transport === 'stdio' ? command.trim() : url.trim())
    const argsWarning = useMemo(() => (argsHaveSecret(parseArgs(argsText)) ? SECRET_WARNING : null), [argsText])
    const urlWarning = useMemo(() => (urlHasSecret(url.trim()) ? SECRET_WARNING : null), [url])

    return (
        <PanelEditorShell>
            <PanelEditorHeader title={fieldsLocked ? 'MCP server' : isEdit ? 'Edit MCP server' : 'New MCP server'} onBack={onBack} />
            <PanelEditorBody>
                {error && <p className="text-xs text-destructive">{error}</p>}
                {readOnly && <p className="text-xs text-muted-foreground">This MCP server is provided by an app and is managed automatically.</p>}
                <Input label="Name" helperText={`Tools are merged as "${name.trim() || 'name'}_<tool>".`} hideRequired disabled={fieldsLocked} value={name} onChange={e => setName(e.target.value)} placeholder="filesystem" className="h-8 text-sm" />

                <Field label="Transport">
                    <div className="flex gap-1 rounded-md border border-border p-0.5">
                        <button type="button" disabled={fieldsLocked} onClick={() => setTransport('stdio')} className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${transport === 'stdio' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>
                            stdio
                        </button>
                        <button type="button" disabled={fieldsLocked} onClick={() => setTransport('sse')} className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${transport === 'sse' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>
                            sse
                        </button>
                        <button type="button" disabled={fieldsLocked} onClick={() => setTransport('http')} className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${transport === 'http' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>
                            http
                        </button>
                    </div>
                </Field>

                {transport === 'stdio' ? (
                    <>
                        <Input label="Command" hideRequired disabled={fieldsLocked} value={command} onChange={e => setCommand(e.target.value)} placeholder="npx" className="h-8 text-sm font-mono" />
                        <McpVarTextarea
                            label="Arguments"
                            helperText={fieldsLocked ? 'One argument per line.' : 'One argument per line. Click a highlighted ${NAME} to change the value behind it.'}
                            warning={argsWarning}
                            value={argsText}
                            onChange={setArgsText}
                            placeholder={'-y\n@modelcontextprotocol/server-filesystem\n/path'}
                            vars={vars}
                            minHeightClassName="min-h-20"
                            disabled={fieldsLocked}
                        />
                    </>
                ) : (
                    <McpVarTextarea
                        label="URL"
                        helperText={fieldsLocked ? undefined : 'Click a highlighted ${NAME} to change the value behind it.'}
                        warning={urlWarning}
                        value={url}
                        onChange={setUrl}
                        placeholder="https://example.com/sse"
                        vars={vars}
                        minHeightClassName="min-h-8"
                        singleLine
                        disabled={fieldsLocked}
                    />
                )}

                <McpVarTextarea label="Environment" helperText={fieldsLocked ? 'One KEY=value per line. Values are stored on the engine.' : 'One KEY=value per line. Values are stored on the engine; click a highlighted ${NAME} to change the value behind it.'} value={envText} onChange={setEnvText} placeholder={'API_KEY=...\nOTHER=value'} vars={vars} disabled={fieldsLocked} />

                {transport !== 'stdio' && (
                    <McpVarTextarea label="Headers" helperText={fieldsLocked ? 'One Header=value per line. Sent with each request (use for auth).' : 'One Header=value per line. Sent with each request (use for auth). Click a highlighted ${NAME} to change the value behind it.'} value={headersText} onChange={setHeadersText} placeholder={'Authorization=Bearer ...\nx-auth-token=...'} vars={vars} disabled={fieldsLocked} />
                )}

            </PanelEditorBody>
            {!readOnly && (
                <PanelEditorFooter>
                    {isEdit && onDelete && (
                        <TooltipDisabledReason reason={manageReason}>
                            <PanelDeleteButton
                                label="Delete server"
                                busy={deleting}
                                disabled={saving || !canManage}
                                onClick={handleDelete}
                                confirmTitle={`Delete ${name || 'this server'}?`}
                                confirmDescription="The coworker loses every tool this server exposes. Its stored variables go with it."
                            />
                        </TooltipDisabledReason>
                    )}
                    <TooltipDisabledReason reason={manageReason} className="flex-1">
                        <Button size="sm" className="flex-1" loading={saving} onClick={handleSave} disabled={deleting || !canSave || !canManage}>
                            {isEdit ? 'Save changes' : 'Create server'}
                        </Button>
                    </TooltipDisabledReason>
                </PanelEditorFooter>
            )}
        </PanelEditorShell>
    )
}
