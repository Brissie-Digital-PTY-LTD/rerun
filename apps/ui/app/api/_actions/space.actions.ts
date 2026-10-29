'use server'

import { assertAdminUser } from '@/lib/auth/admin'
import { requireWorkspaceContext, requireWorkspaceId } from '@/app/api/_auth/ownership'
import { createBox, deleteBox, renameBox } from '@/app/api/_services/box.service'
import { findWorkspaceEngine, NoEngineError } from '@/app/api/_services/workspace-engine.service'
import { restartManagedEngine } from '@/cloud/engines'
import type { SpaceSide } from '@/lib/board/space-layout'

// Server Actions can't surface thrown error messages in production: Next.js
// redacts them to a generic "an error occurred in the Server Components render"
// digest. So these actions return the error as a serializable value instead,
// and the client re-throws it (where the real message survives) for the UI.
export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string }

export async function claimSpaceAction(params: { workspaceId: number; name?: string | null; from?: { spaceId: string; side: SpaceSide } }): Promise<ActionResult<{ spaceId: string; colStart: number; rowStart: number }>> {
    try {
        // Trust the session for the workspace, not the client-supplied workspaceId.
        const { workspace, userId } = await requireWorkspaceContext()
        return await createBox({ workspaceId: workspace.id, userId, name: params.name, from: params.from })
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to create the Box' }
    }
}

export async function renameSpaceAction(spaceId: string, newName: string): Promise<void> {
    await renameBox(await requireWorkspaceId(), spaceId, newName)
}

export async function deleteSpaceAction(spaceId: string): Promise<ActionResult> {
    try {
        await deleteBox(await requireWorkspaceId(), spaceId)
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete the Box' }
    }
}

const NOT_MANAGED_ERROR = 'This workspace runs on an engine Rerun does not host, so it cannot power it on or off'

// The machine belongs to the workspace, so these two act on the workspace, whichever Box the
// button was pressed from.
async function managedInstanceId(): Promise<string> {
    await assertAdminUser()
    const engine = await findWorkspaceEngine(await requireWorkspaceId())
    if (!engine) throw new NoEngineError()
    if (!engine.managed) throw new Error(NOT_MANAGED_ERROR)
    return engine.instanceId
}

// Restarts the workspace's VPS via a Trigger task: stop/start is long and the public IP changes,
// so it is re-mapped onto engine_pool asynchronously once the box is back up.
export async function restartWorkspaceEngineAction(): Promise<ActionResult> {
    try {
        await restartManagedEngine(await managedInstanceId())
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to restart the workspace machine' }
    }
}
