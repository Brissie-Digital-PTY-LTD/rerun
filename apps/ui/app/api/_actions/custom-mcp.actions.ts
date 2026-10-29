'use server'

import { assertAgentInWorkspace } from '@/app/api/_auth/ownership'
import { listAgentConnectors, removeCustomMcpServer } from '@/app/api/_services/custom-mcp.service'
import type { CustomMcpServer, InstalledService } from '@/lib/services/types'

export async function listAgentConnectorsAction(agentId: string): Promise<{ services: InstalledService[]; custom: CustomMcpServer[] }> {
    try {
        await assertAgentInWorkspace(agentId)
        return await listAgentConnectors(agentId)
    } catch {
        return { services: [], custom: [] }
    }
}

export async function removeCustomMcpServerAction(agentId: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAgentInWorkspace(agentId)
        await removeCustomMcpServer(agentId, name)
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to remove the server' }
    }
}
