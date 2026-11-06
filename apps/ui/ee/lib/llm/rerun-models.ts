import { RERUN_MODELS, RERUN_TIERS, type RerunUpstreamModels } from '@rerun/contracts'
import { RERUN_UPSTREAM_MODELS, servedRerunTier } from '@/lib/engine/constants'
import { getWorkspaceBudgetByEngineKey } from '@/ee/services/rerunBudget.service'

// The same resolution as the proxy, for this workspace: a trial asking for Smart is told Balanced.
export async function GET(req: Request) {
    const header = req.headers.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    const resolved = token ? await getWorkspaceBudgetByEngineKey(token) : null
    if (!resolved) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const models = Object.fromEntries(RERUN_TIERS.map(tier => [RERUN_MODELS[tier], RERUN_UPSTREAM_MODELS[servedRerunTier(tier, resolved.smartAllowed)]]))
    return Response.json({ models } satisfies RerunUpstreamModels)
}
