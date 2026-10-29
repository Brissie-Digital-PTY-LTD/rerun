'use server'

import { agentShareIncludeSchema, type AgentSharePreview } from '@rerun/contracts'
import { z } from 'zod'
import { getAdminEmail } from '@/lib/auth/admin'
import { assertAgentInWorkspace, assertSpaceInWorkspace, requireWorkspaceContext } from '@/app/api/_auth/ownership'
import { createAgentShare, planAgentShare, type AgentSharePlan } from '@/lib/agents/share-create'
import { installAgentShare, type AgentShareInstallOutcome } from '@/lib/agents/share-install'
import { listWorkspaceShares, readAgentShare, revokeAgentShare, type WorkspaceShare } from '@/lib/agents/share-read'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectMaybeSingle } from '@/supabase/supabase-helpers'

// Unlike a template capture, none of this is gated on the sandbox: a share is a transfer to one
// person behind an unguessable, revocable token, not a page anyone installs from. What replaces
// that gate is the freeze (the snapshot cannot grow after it is sent), the redaction (the engine
// strips every credential on the way out) and revocation (the object is deleted, not flagged).

type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string }

function failed(err: unknown, fallback: string): { ok: false; error: string } {
    return { ok: false, error: err instanceof Error ? err.message : fallback }
}

export async function planAgentShareAction(agentId: string): Promise<ActionResult<{ plan: AgentSharePlan }>> {
    try {
        const id = z.string().uuid().parse(agentId)
        const { workspace_id } = await assertAgentInWorkspace(id)
        return { ok: true, plan: await planAgentShare(createServiceRoleClient(), id, workspace_id) }
    } catch (err) {
        return failed(err, 'Could not inspect this coworker')
    }
}

const createInputSchema = z.object({ agentId: z.string().uuid(), include: agentShareIncludeSchema })

export async function createAgentShareAction(input: unknown): Promise<ActionResult<{ url: string; warnings: string[]; reused: boolean }>> {
    try {
        const { agentId, include } = createInputSchema.parse(input)
        await assertAgentInWorkspace(agentId)
        const ctx = await requireWorkspaceContext()
        const { url, warnings, reused } = await createAgentShare(ctx.supabase, { agentRowId: agentId, workspaceId: ctx.workspace.id, userId: ctx.userId, include })
        return { ok: true, url, warnings, reused }
    } catch (err) {
        return failed(err, 'Could not create a share link')
    }
}

export async function listAgentSharesAction(): Promise<ActionResult<{ shares: WorkspaceShare[] }>> {
    try {
        const ctx = await requireWorkspaceContext()
        return { ok: true, shares: await listWorkspaceShares(ctx.supabase, ctx.workspace.id) }
    } catch (err) {
        return failed(err, 'Could not read your share links')
    }
}

export async function revokeAgentShareAction(shareId: string): Promise<ActionResult<object>> {
    try {
        const id = z.string().uuid().parse(shareId)
        const ctx = await requireWorkspaceContext()
        await revokeAgentShare(ctx.supabase, id, ctx.workspace.id)
        return { ok: true }
    } catch (err) {
        return failed(err, 'Could not revoke this link')
    }
}

// No session at all: the token is the capability, and this is what a visitor without an account
// reads before deciding to sign up. A revoked, swept or never-real token answers the same `null`,
// so the link cannot be used to confirm that something once existed here.
export async function getSharedAgentAction(token: string): Promise<AgentSharePreview | null> {
    const parsed = z.string().trim().max(64).safeParse(token)
    if (!parsed.success) return null
    return readAgentShare(createServiceRoleClient(), parsed.data)
}

const installInputSchema = z.object({
    token: z.string().min(1).max(64),
    spaceId: z.string().uuid(),
    position: z.object({ col: z.number().int(), row: z.number().int() }).optional(),
})

export type InstallSharedAgentResult = ({ ok: true } & AgentShareInstallOutcome) | { ok: false; error: string }

// The target space comes from the client but its workspace never does: assertSpaceInWorkspace
// resolves it from the session, so an id from somewhere else resolves to "space not found".
//
// The plan gate is re-checked here for the same reason it is on a template install: this action
// lands paid compute from a link anyone can hold, so UI-only gating would mean calling the action
// by hand is enough to skip it.
export async function installSharedAgentAction(input: unknown): Promise<InstallSharedAgentResult> {
    try {
        const { token, spaceId, position } = installInputSchema.parse(input)
        const { workspace_id } = await assertSpaceInWorkspace(spaceId)
        const supabase = createServiceRoleClient()

        if ((await getAdminEmail()) === null) {
            const { data: workspace } = await selectMaybeSingle(supabase, 'workspaces', ['subscription_status'] as const, { id: workspace_id })
            const status = workspace?.subscription_status
            if (status !== 'active' && status !== 'trialing') throw new Error('This workspace has no active plan.')
        }

        return { ok: true, ...(await installAgentShare(supabase, token, { workspaceId: workspace_id, spaceId, position })) }
    } catch (err) {
        return failed(err, 'Could not add this coworker to your board')
    }
}
