'use server'

import { boxAccessOf, toAccessLevel, toVisibility, type AccessLevel, type BoxAccess, type SpaceVisibility } from '@/app/api/_auth/access'
import { requireAdminContext, requireWorkspaceContext, toBoxScope, type BoxScope, type WorkspaceRole } from '@/app/api/_auth/ownership'
import type { Database } from '@/app/api/database.types'
import { resolveMemberIdentities } from '@/app/api/_services/members.service'
import { selectAll, selectMany, selectMaybeSingle } from '@/supabase/supabase-helpers'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { ActionResult } from './space.actions'

const BOX_ACCESS_ADMIN_ONLY = 'Only an admin can change who can access a Box'
const BOX_NOT_FOUND = 'Box not found'
const NOT_A_MEMBER = 'This user is not a member of the workspace.'
const ADMINS_ALWAYS = 'Admins always have access to every Box'

type ServiceClient = SupabaseClient<Database>

export type SpaceAccessPerson = { userId: string; access: AccessLevel; grantedBy: string | null; createdBox: boolean }
export type SpaceAccessMember = { userId: string; email: string | null; role: WorkspaceRole }
export type SpaceAccessCoworker = { id: string; name: string }
export type SpaceAccessView = { spaceId: string; name: string | null; visibility: SpaceVisibility; coworkers: SpaceAccessCoworker[]; people: SpaceAccessPerson[]; members: SpaceAccessMember[] }

// Where a person's level on a Box comes from: being an admin, a row naming them, the Box being open
// to a person whose scope is `all`, or nothing.
export type MemberBoxSource = 'admin' | 'assigned' | 'workspace' | 'none'
export type MemberBoxAccess = { spaceId: string; name: string | null; agentCount: number; visibility: SpaceVisibility; access: BoxAccess; source: MemberBoxSource }
export type MemberAccessView = { userId: string; role: WorkspaceRole; boxScope: BoxScope; boxes: MemberBoxAccess[] }

async function spaceOfWorkspace(supabase: ServiceClient, workspaceId: number, spaceId: string) {
    const { data: space } = await selectMaybeSingle(supabase, 'spaces', ['id', 'workspace_id', 'name', 'visibility'] as const, { id: spaceId })
    return space && space.workspace_id === workspaceId ? space : null
}

function failure(err: unknown, fallback: string): { ok: false; error: string } {
    return { ok: false, error: err instanceof Error ? err.message : fallback }
}

export async function getSpaceAccessAction(spaceId: string): Promise<ActionResult<SpaceAccessView>> {
    try {
        const { workspace, supabase } = await requireAdminContext(BOX_ACCESS_ADMIN_ONLY)
        const space = await spaceOfWorkspace(supabase, workspace.id, spaceId)
        if (!space) return { ok: false, error: BOX_NOT_FOUND }

        const [{ data: agentRows }, { data: grantRows }, { data: memberRows }] = await Promise.all([
            selectAll(supabase, 'agents', ['id', 'name'] as const, { workspace_id: workspace.id, space_id: spaceId }, { column: 'created_at', ascending: true }),
            selectAll(supabase, 'space_members', ['user_id', 'access', 'granted_by'] as const, { space_id: spaceId, workspace_id: workspace.id }, { column: 'created_at', ascending: true }),
            selectAll(supabase, 'workspace_members', ['user_id', 'role'] as const, { workspace_id: workspace.id }, { column: 'created_at', ascending: true }),
        ])
        const members = memberRows ?? []
        const identities = await resolveMemberIdentities(supabase, members.map(m => m.user_id))

        const people: SpaceAccessPerson[] = (grantRows ?? []).flatMap(row => {
            const access = toAccessLevel(row.access)
            return access ? [{ userId: row.user_id, access, grantedBy: row.granted_by, createdBox: row.granted_by === row.user_id }] : []
        })

        return {
            ok: true,
            spaceId: space.id,
            name: space.name,
            visibility: toVisibility(space.visibility),
            coworkers: (agentRows ?? []).map(agent => ({ id: agent.id, name: agent.name })),
            people,
            members: members.map(m => ({ userId: m.user_id, email: identities.get(m.user_id)?.email ?? null, role: m.role })),
        }
    } catch (err) {
        return failure(err, 'Failed to load who can access this Box')
    }
}

export async function setSpaceVisibilityAction(spaceId: string, visibility: SpaceVisibility): Promise<ActionResult> {
    try {
        const { workspace, supabase } = await requireAdminContext(BOX_ACCESS_ADMIN_ONLY)
        if (visibility !== 'workspace' && visibility !== 'restricted') return { ok: false, error: 'Unknown visibility' }
        if (!(await spaceOfWorkspace(supabase, workspace.id, spaceId))) return { ok: false, error: BOX_NOT_FOUND }

        const { error } = await supabase.from('spaces').update<Database['public']['Tables']['spaces']['Update']>({ visibility }).eq('id', spaceId).eq('workspace_id', workspace.id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
    } catch (err) {
        return failure(err, 'Failed to change who can access this Box')
    }
}

export async function grantSpaceAccessAction(spaceId: string, userIds: string[], access: AccessLevel): Promise<ActionResult> {
    try {
        const { userId: grantor, workspace, supabase } = await requireAdminContext(BOX_ACCESS_ADMIN_ONLY)
        if (access !== 'use' && access !== 'manage') return { ok: false, error: 'Unknown access level' }
        const targets = [...new Set(userIds)]
        if (targets.length === 0) return { ok: true }
        if (!(await spaceOfWorkspace(supabase, workspace.id, spaceId))) return { ok: false, error: BOX_NOT_FOUND }

        const [{ data: memberRows }, { data: existingRows }] = await Promise.all([
            selectMany(supabase, 'workspace_members', ['user_id', 'role'] as const, { workspace_id: workspace.id, user_id: targets }),
            selectMany(supabase, 'space_members', ['user_id', 'granted_by'] as const, { space_id: spaceId, user_id: targets }),
        ])
        const roleOf = new Map((memberRows ?? []).map(m => [m.user_id, m.role]))
        if (targets.some(id => !roleOf.has(id))) return { ok: false, error: NOT_A_MEMBER }
        if (targets.some(id => roleOf.get(id) === 'admin')) return { ok: false, error: ADMINS_ALWAYS }

        // A level changed on an existing row keeps who granted it, so the creator of the Box stays known.
        const grantedBy = new Map((existingRows ?? []).map(row => [row.user_id, row.granted_by]))
        const rows: Database['public']['Tables']['space_members']['Insert'][] = targets.map(id => ({
            space_id: spaceId,
            user_id: id,
            workspace_id: workspace.id,
            access,
            granted_by: grantedBy.has(id) ? grantedBy.get(id) : grantor,
        }))
        const { error } = await supabase.from('space_members').upsert<Database['public']['Tables']['space_members']['Insert']>(rows, { onConflict: 'space_id,user_id' })
        if (error) return { ok: false, error: error.message }
        return { ok: true }
    } catch (err) {
        return failure(err, 'Failed to give access to this Box')
    }
}

export async function revokeSpaceAccessAction(spaceId: string, userId: string): Promise<ActionResult> {
    try {
        const { workspace, supabase } = await requireAdminContext(BOX_ACCESS_ADMIN_ONLY)
        if (!(await spaceOfWorkspace(supabase, workspace.id, spaceId))) return { ok: false, error: BOX_NOT_FOUND }

        const { error } = await supabase.from('space_members').delete().eq('space_id', spaceId).eq('user_id', userId).eq('workspace_id', workspace.id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
    } catch (err) {
        return failure(err, 'Failed to remove access to this Box')
    }
}

function sourceOf(role: WorkspaceRole, grant: AccessLevel | null, access: BoxAccess): MemberBoxSource {
    if (role === 'admin') return 'admin'
    if (grant) return 'assigned'
    return access === 'use' ? 'workspace' : 'none'
}

// Every Box of the workspace seen from one person. A member reads only themselves, and only the
// Boxes they reach: the others do not exist for them.
export async function listMemberAccessAction(targetUserId: string): Promise<ActionResult<MemberAccessView>> {
    try {
        const ctx = await requireWorkspaceContext()
        const viewerIsAdmin = ctx.role === 'admin'
        if (!viewerIsAdmin && targetUserId !== ctx.userId) return { ok: false, error: 'Only an admin can see the Boxes of another member' }
        const { workspace, supabase } = ctx

        const { data: target } = await selectMaybeSingle(supabase, 'workspace_members', ['role', 'box_scope'] as const, { user_id: targetUserId, workspace_id: workspace.id })
        if (!target) return { ok: false, error: NOT_A_MEMBER }

        const [{ data: spaceRows }, { data: agentRows }, { data: grantRows }] = await Promise.all([
            selectAll(supabase, 'spaces', ['id', 'workspace_id', 'name', 'visibility'] as const, { workspace_id: workspace.id }, { column: 'created_at', ascending: true }),
            selectAll(supabase, 'agents', ['space_id'] as const, { workspace_id: workspace.id }),
            selectAll(supabase, 'space_members', ['space_id', 'access'] as const, { user_id: targetUserId, workspace_id: workspace.id }),
        ])

        const agentCount = new Map<string, number>()
        for (const agent of agentRows ?? []) agentCount.set(agent.space_id, (agentCount.get(agent.space_id) ?? 0) + 1)
        const grantOf = new Map((grantRows ?? []).map(row => [row.space_id, toAccessLevel(row.access)]))
        const boxScope = toBoxScope(target.box_scope)
        const actor = { kind: 'user' as const, userId: targetUserId, workspaceId: workspace.id, role: target.role, boxScope }

        const boxes = (spaceRows ?? [])
            .map((space): MemberBoxAccess => {
                const grant = grantOf.get(space.id) ?? null
                const access = boxAccessOf(actor, space, grant)
                return { spaceId: space.id, name: space.name, agentCount: agentCount.get(space.id) ?? 0, visibility: toVisibility(space.visibility), access, source: sourceOf(target.role, grant, access) }
            })
            .filter(box => viewerIsAdmin || box.access !== 'none')

        return { ok: true, userId: targetUserId, role: target.role, boxScope, boxes }
    } catch (err) {
        return failure(err, 'Failed to load the Boxes of this member')
    }
}
