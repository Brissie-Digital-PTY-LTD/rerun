'use server'

import { assertAgentAccess } from '@/app/api/_auth/access'
import { listAgentConnectors, removeCustomMcpServer } from '@/app/api/_services/custom-mcp.service'
import type { CustomMcpServer, InstalledService } from '@/lib/services/types'

export async function listAgentConnectorsAction(agentId: string): Promise<{ services: InstalledService[]; custom: CustomMcpServer[] }> {
    try {
        const { actor } = await assertAgentAccess(agentId, 'use')
        return await listAgentConnectors(agentId, actor)
    } catch {
        return { services: [], custom: [] }
    }
}

export async function removeCustomMcpServerAction(agentId: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { actor } = await assertAgentAccess(agentId, 'manage')
        await removeCustomMcpServer(agentId, name, actor)
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to remove the server' }
    }
}
