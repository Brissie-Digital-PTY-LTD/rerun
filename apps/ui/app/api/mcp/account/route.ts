import { dispatchAccountTool } from '@/app/api/_services/mcp-account.service'
import { ACCOUNT_TOOL_DEFS } from '@/lib/mcp/account-tools'
import { authenticateApiKey } from '@/lib/mcp/api-keys'
import { responseTooLarge, tooLargeMessage } from '@/lib/mcp/truncate'

// The "Rerun" MCP server: it lets an external AI agent (Claude Code and friends) shape a
// Rerun account — agents, their prompt, their skills, their scheduled tasks, their
// connectors. A tiny stateless JSON-RPC 2.0 handler rather than the MCP SDK, which
// sidesteps session management, SSE keep-alives and cold starts. Callers authenticate with an account API key.
export const dynamic = 'force-dynamic'

const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07']
const DEFAULT_PROTOCOL_VERSION = '2025-06-18'

function rpcResult(id: unknown, result: unknown): Response {
    return Response.json({ jsonrpc: '2.0', id, result })
}

function rpcError(id: unknown, code: number, message: string): Response {
    return Response.json({ jsonrpc: '2.0', id, error: { code, message } })
}

export async function POST(req: Request): Promise<Response> {
    const header = req.headers.get('authorization') ?? ''
    const key = await authenticateApiKey(header.startsWith('Bearer ') ? header.slice(7) : '')
    if (!key) {
        return new Response('Unauthorized', { status: 401 })
    }

    let rpc: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> }
    try {
        rpc = await req.json()
    } catch {
        return rpcError(null, -32700, 'Parse error')
    }

    const { method, id, params } = rpc

    if (typeof method === 'string' && method.startsWith('notifications/')) {
        return new Response(null, { status: 202 })
    }

    if (method === 'initialize') {
        const requested = params?.protocolVersion
        const protocolVersion = typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : DEFAULT_PROTOCOL_VERSION
        return rpcResult(id, {
            protocolVersion,
            capabilities: { tools: {} },
            serverInfo: { name: 'rerun', version: '1.0.0' },
        })
    }

    if (method === 'tools/list') {
        return rpcResult(id, { tools: ACCOUNT_TOOL_DEFS })
    }

    if (method === 'tools/call') {
        const name = typeof params?.name === 'string' ? params.name : ''
        const args = (params?.arguments ?? {}) as Record<string, unknown>
        try {
            const out = await dispatchAccountTool(key.workspaceId, name, args, { actorUserId: key.createdBy })
            const text = JSON.stringify(out)
            // Backstop under the per-field limits the handlers apply. A tool result stays in the
            // caller's transcript for good, so an oversized one is refused rather than cut: the
            // model can narrow its request, where it could not recover from truncated JSON.
            if (responseTooLarge(text)) {
                const message = tooLargeMessage(name, text.length)
                console.error(`[mcp-account] tools/call ${name} refused:`, message)
                return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true })
            }
            return rpcResult(id, { content: [{ type: 'text', text }], structuredContent: out })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Tool failed'
            console.error(`[mcp-account] tools/call ${name} failed:`, message)
            // Surface as a tool execution error (isError) rather than a protocol error, so the
            // client model reads the reason and can correct its arguments.
            return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true })
        }
    }

    return rpcError(id, -32601, `Method not found: ${method}`)
}
