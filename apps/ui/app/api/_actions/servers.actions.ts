'use server'

import { requireAdminContext, requireWorkspaceContext } from '@/app/api/_auth/ownership'
import { attachServerManually, createPairingToken, detachWorkspaceServer, readWorkspaceServer, ServerPairingError, type WorkspaceServer } from '@/app/api/_services/servers.service'
import { SERVERS_ENABLED } from '@rerun/cloud/servers'

type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

const DISABLED = 'Servers are managed by Rerun Cloud.'
const SERVERS_ADMIN_ONLY = 'Only an admin can manage servers'

function failure(error: unknown): { ok: false; error: string } {
    if (error instanceof ServerPairingError) return { ok: false, error: error.message }
    console.error('[servers]', error)
    return { ok: false, error: error instanceof Error ? error.message : 'Something went wrong' }
}

export async function getWorkspaceServerAction(): Promise<Result<{ server: WorkspaceServer | null }>> {
    if (!SERVERS_ENABLED) return { ok: false, error: DISABLED }
    try {
        const ctx = await requireWorkspaceContext()
        return { ok: true, server: await readWorkspaceServer(ctx.workspace.id) }
    } catch (error) {
        return failure(error)
    }
}

export async function createPairingTokenAction(): Promise<Result<{ token: string; expiresAt: string }>> {
    if (!SERVERS_ENABLED) return { ok: false, error: DISABLED }
    try {
        const ctx = await requireAdminContext(SERVERS_ADMIN_ONLY)
        return { ok: true, ...(await createPairingToken(ctx.workspace.id, ctx.userId)) }
    } catch (error) {
        return failure(error)
    }
}

export async function attachServerManuallyAction(input: { url: string; apiKey: string }): Promise<Result<object>> {
    if (!SERVERS_ENABLED) return { ok: false, error: DISABLED }
    if (!input.url.trim() || !input.apiKey.trim()) return { ok: false, error: 'Enter the address and the key of the server.' }
    try {
        const ctx = await requireAdminContext(SERVERS_ADMIN_ONLY)
        await attachServerManually(ctx.workspace.id, input)
        return { ok: true }
    } catch (error) {
        return failure(error)
    }
}

export async function detachServerAction(): Promise<Result<object>> {
    if (!SERVERS_ENABLED) return { ok: false, error: DISABLED }
    try {
        const ctx = await requireAdminContext(SERVERS_ADMIN_ONLY)
        await detachWorkspaceServer(ctx.workspace.id)
        return { ok: true }
    } catch (error) {
        return failure(error)
    }
}
