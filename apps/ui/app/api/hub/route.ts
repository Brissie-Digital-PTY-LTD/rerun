import { FOREMAN_AGENT_ID, FOREMAN_HUB_TOKEN_HEADER } from '@rerun/contracts'

import { dispatchForemanHubTool } from '@/app/api/_services/foreman-hub.service'
import { dispatchHubTool } from '@/app/api/_services/services.service'
import { authenticateEngineToken } from '@/app/api/_services/workspace-engine.service'
import { foremanHubTokenRequired, verifyForemanHubToken } from '@/lib/foreman/hub-token'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectMaybeSingle } from '@/supabase/supabase-helpers'

// Rerun Hub REST endpoint. The engine's built-in `rerun_hub_*` tools call this over
// the public internet, authenticated with its RERUN_API_KEY (same identity as the engine
// webhooks), which names one workspace. The `x-rerun-agent` header carries the ENGINE agent
// id, resolved here to the Supabase agent of that workspace. Every coworker of the box holds that
// key, so `foreman` must also carry the token the hub signed into the foreman's brief.
export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
    const header = req.headers.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    const engine = await authenticateEngineToken(token)
    if (!engine) {
        console.warn('[hub] rejected request with invalid/absent engine key')
        return new Response('Unauthorized', { status: 401 })
    }

    const engineAgentId = req.headers.get('x-rerun-agent') ?? ''
    if (!engineAgentId) return new Response('Missing x-rerun-agent header', { status: 400 })

    // The foreman has no agent row: it speaks for the whole workspace the engine key names.
    const isForeman = engineAgentId === FOREMAN_AGENT_ID
    if (isForeman) {
        const foremanToken = req.headers.get(FOREMAN_HUB_TOKEN_HEADER)
        if (foremanToken) {
            if (!verifyForemanHubToken(foremanToken, engine.workspaceId)) return new Response('Invalid foreman token', { status: 403 })
        } else if (foremanHubTokenRequired()) {
            return new Response('Missing foreman token', { status: 403 })
        } else {
            console.warn('[hub] foreman call without token (tolerated)', { workspaceId: engine.workspaceId })
        }
    }
    const supabase = createServiceRoleClient()
    const { data: agent } = isForeman ? { data: null } : await selectMaybeSingle(supabase, 'agents', ['id'] as const, { engine_agent_id: engineAgentId, workspace_id: engine.workspaceId })
    if (!isForeman && !agent) return new Response('Coworker does not belong to the authenticated workspace', { status: 403 })

    let body: { tool?: string; args?: Record<string, unknown> }
    try {
        body = await req.json()
    } catch {
        return new Response('Invalid JSON', { status: 400 })
    }

    const tool = typeof body.tool === 'string' ? body.tool : ''
    const args = (body.args ?? {}) as Record<string, unknown>
    if (!tool) return new Response('Missing tool', { status: 400 })

    try {
        const out = agent ? await dispatchHubTool(agent.id, tool, args, engine.workspaceId) : await dispatchForemanHubTool(engine.workspaceId, tool, args)
        return Response.json(out)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Hub tool failed'
        console.error(`[hub] ${tool} failed:`, message)
        return Response.json({ error: message })
    }
}
