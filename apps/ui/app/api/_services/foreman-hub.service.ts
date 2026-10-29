import 'server-only'

import { workspaceFounderUserId } from '@/app/api/_auth/ownership'
import { dispatchAccountTool } from '@/app/api/_services/mcp-account.service'
import { dispatchBoxTool } from '@/lib/foreman/box-tools'
import { FOREMAN_ENGINE_HUB_TOOL_NAMES, FOREMAN_ENGINE_ONBOARDING_TOOL_NAMES } from '@/lib/foreman/engine-brief'
import { dispatchWorkspaceOnboardingTool } from '@/lib/foreman/onboarding-tools'
import { searchForemanDocs } from '@/lib/foreman/search-docs'
import { FOREMAN_BOX_TOOL_DEFS } from '@/lib/foreman/tool-defs'
import { requireString } from '@/lib/mcp/args'
import { createServiceRoleClient } from '@/supabase/serviceRole'

const BOX_TOOL_NAMES = new Set<string>(FOREMAN_BOX_TOOL_DEFS.map(def => def.name))

// What the engine foreman may do to its workspace, and nothing more: the same allowlist the hub
// hands it as its belt, so a tool name it was never given is refused here too.
export async function dispatchForemanHubTool(workspaceId: number, tool: string, args: Record<string, unknown>): Promise<unknown> {
    if (!FOREMAN_ENGINE_HUB_TOOL_NAMES.has(tool)) throw new Error(`Unknown foreman tool: ${tool}`)

    if (tool === 'search_docs') return searchForemanDocs(requireString(args.query, 'query'))

    // The engine speaks for the workspace, not for a person: a Box is claimed and a template is
    // installed the way an API key caller does it, as the account owner.
    if (BOX_TOOL_NAMES.has(tool)) return dispatchBoxTool({ workspaceId, userId: await founderOf(workspaceId) }, tool, args)
    if (FOREMAN_ENGINE_ONBOARDING_TOOL_NAMES.has(tool)) return dispatchWorkspaceOnboardingTool({ supabase: createServiceRoleClient(), userId: await founderOf(workspaceId), workspace: { id: workspaceId } }, tool, args)

    return dispatchAccountTool(workspaceId, tool, args)
}

async function founderOf(workspaceId: number): Promise<string> {
    const userId = await workspaceFounderUserId(workspaceId)
    if (!userId) throw new Error('This workspace has no member to act for.')
    return userId
}
