'use server'

import { assertAgentInWorkspace, assertSpaceInWorkspace } from '@/app/api/_auth/ownership'
import { createAgentWithSetup } from '@/app/api/_services/agent-setup.service'
import { getCatalogServicesBySlugs, getServiceAlternatives, getServiceDetails, installService, listCatalogServices, markServiceAuthorized, resetServiceConnection, searchServices, uninstallService } from '@/app/api/_services/services.service'
import type { InstallResult, ResetConnectionResult, ServiceAlternative, ServiceChecklistItem, ServiceDetails, ServiceSearchResult } from '@/lib/services/types'

// Install (or configure) a service on an agent. Used by both the chat config form and
// the Services settings tab — the same compile path either way. Returns needs_config
// (without compiling) when required inputs are still missing. `key` is a slug for the base
// account or `slug@id` for another one; `newInstance` adds a fresh account.
export async function installServiceAction(
    agentId: string,
    key: string,
    values: Record<string, string>,
    authMethodId?: string,
    opts?: { newInstance?: boolean },
): Promise<{ ok: true; result: InstallResult } | { ok: false; error: string }> {
    try {
        await assertAgentInWorkspace(agentId)
        const result = await installService(agentId, key, values, authMethodId, undefined, opts)
        return { ok: true, result }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to install service' }
    }
}

// Browse the library (optionally filtered). `installed` is resolved per agent.
export async function searchServicesAction(agentId: string, query?: string, category?: string): Promise<ServiceSearchResult[]> {
    try {
        await assertAgentInWorkspace(agentId)
        const { results } = await searchServices(agentId, query, category)
        return results
    } catch {
        return []
    }
}

// Browse the global catalog with no agent context (agent-creation dialog). Paginated so it
// scales past 1000 services; `installed` is always false and selection is applied at creation
// via createAgentWithSetupAction. Free-text lookup uses searchCatalogServicesAction instead.
export async function listCatalogServicesAction(opts?: { category?: string; limit?: number; offset?: number }): Promise<ServiceSearchResult[]> {
    try {
        return await listCatalogServices(opts)
    } catch {
        return []
    }
}

// Resolve full catalog metadata for specific slugs (agent-creation dialog tile cache, e.g.
// the finish-setup checklist whose services may lie outside the loaded browse pages).
export async function getCatalogServicesBySlugsAction(slugs: string[]): Promise<ServiceSearchResult[]> {
    try {
        return await getCatalogServicesBySlugs(slugs)
    } catch {
        return []
    }
}

export async function getServiceAlternativesAction(slugs: string[]): Promise<Record<string, ServiceAlternative[]>> {
    try {
        return await getServiceAlternatives(slugs)
    } catch {
        return {}
    }
}

export async function getServiceDetailsAction(agentId: string, key: string): Promise<ServiceDetails | null> {
    try {
        await assertAgentInWorkspace(agentId)
        return await getServiceDetails(agentId, key)
    } catch {
        return null
    }
}

// Flip an OAuth service to active after the user finishes the sign-in popup.
export async function markServiceAuthorizedAction(agentId: string, key: string): Promise<{ success: boolean }> {
    try {
        await assertAgentInWorkspace(agentId)
        await markServiceAuthorized(agentId, key)
        return { success: true }
    } catch {
        return { success: false }
    }
}

// Reset a connected service so the user can go through its sign-in (or its config) again.
// Non-destructive: nothing the install compiled is removed, only the stored token.
export async function resetServiceConnectionAction(agentId: string, key: string): Promise<{ ok: true; result: ResetConnectionResult } | { ok: false; error: string }> {
    try {
        await assertAgentInWorkspace(agentId)
        return { ok: true, result: await resetServiceConnection(agentId, key) }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to reset app' }
    }
}

export async function uninstallServiceAction(agentId: string, key: string): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAgentInWorkspace(agentId)
        await uninstallService(agentId, key)
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to uninstall service' }
    }
}

// --- Agent creation ---

// Create the agent and install the services the user picked, all at drop. Services that
// need secrets come back in the checklist for the user to finish configuring.
export async function createAgentWithSetupAction(params: { name: string; description?: string; serviceSlugs?: string[]; workspaceId: number; spaceId: string; col?: number; row?: number }): Promise<{ ok: true; agentId: string; active: boolean; checklist: ServiceChecklistItem[] } | { ok: false; error: string }> {
    try {
        const space = await assertSpaceInWorkspace(params.spaceId)
        const { agentId, active, checklist } = await createAgentWithSetup({ ...params, workspaceId: space.workspace_id })
        return { ok: true, agentId, active, checklist }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to create coworker' }
    }
}
