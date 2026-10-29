'use server'

import { assertAgentInWorkspace } from '@/app/api/_auth/ownership'
import { listPublished, publishFile, unpublishFile } from '@/lib/services/publish'
import type { PublishedFile } from '@/lib/services/types'

// Files an agent has published publicly (see lib/services/publish.ts). Read by the Files
// tab (components/AgentPanelFiles.tsx) to mark which workspace files are public and let
// the user open, copy or revoke their links inline.
export async function listPublishedAction(agentId: string): Promise<PublishedFile[]> {
    try {
        await assertAgentInWorkspace(agentId)
        const { files } = await listPublished(agentId)
        return files
    } catch {
        return []
    }
}

// Publish a workspace file to a public URL (manual publish from the Files tab).
export async function publishFileAction(agentId: string, path: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        await assertAgentInWorkspace(agentId)
        const result = await publishFile(agentId, path)
        return { success: true, url: result.url }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to publish' }
    }
}

// Revoke a published file by its slug: deletes the public copy and makes its URL 404.
export async function unpublishFileAction(agentId: string, slug: string): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAgentInWorkspace(agentId)
        await unpublishFile(agentId, { slug })
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to unpublish' }
    }
}
