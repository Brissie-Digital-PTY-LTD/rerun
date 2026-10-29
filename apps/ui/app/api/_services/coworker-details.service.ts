import 'server-only'
import { AuthorizationError, type WorkspaceContext } from '@/app/api/_auth/ownership'
import { deleteAgent, renameAgent } from '@/app/api/_services/agent.service'
import { resolveAgentTarget } from '@/app/api/_services/chat.service'
import { patchNotificationPrefs, readNotificationPrefs } from '@/app/api/_services/notification-prefs.service'
import { listFiles, listSchedules, listSkillSummaries, listTriggers, updateSchedule, updateTrigger } from '@/lib/engine/client'
import { coworkerRuleOf } from '@/lib/notifications/prefs'
import { humanCron } from '@/lib/schedules/cron'
import { selectMaybeSingle } from '@/supabase/supabase-helpers'
import type { CoworkerFile, CoworkerFiles, CoworkerNotifications, CoworkerNotifyMode, RenameCoworkerInput, RoutineKind, RoutinesView, SkillSummariesView } from '@rerun/contracts'

// Renaming and deleting reach a coworker the engine may not answer for (switched off, not set up),
// so they only check the row belongs to the caller's workspace.
async function assertCoworkerOwned(ctx: WorkspaceContext, agentId: string): Promise<void> {
    const { data } = await selectMaybeSingle(ctx.supabase, 'agents', ['workspace_id'] as const, { id: agentId })
    if (!data || data.workspace_id !== ctx.workspace.id) throw new AuthorizationError('Coworker not found')
}

export async function renameCoworker(ctx: WorkspaceContext, agentId: string, input: RenameCoworkerInput): Promise<void> {
    await assertCoworkerOwned(ctx, agentId)
    await renameAgent(agentId, input.name)
}

export async function deleteCoworker(ctx: WorkspaceContext, agentId: string): Promise<void> {
    await assertCoworkerOwned(ctx, agentId)
    await deleteAgent(agentId)
}

export async function listCoworkerRoutines(ctx: WorkspaceContext, agentId: string): Promise<RoutinesView> {
    const { conn, engineAgentId } = await resolveAgentTarget(agentId, ctx.workspace.id)
    const [schedules, triggers] = await Promise.all([listSchedules(conn, engineAgentId), listTriggers(conn, engineAgentId)])
    return {
        routines: [
            ...schedules.map(schedule => ({
                kind: 'schedule' as const,
                slug: schedule.slug,
                name: schedule.name,
                enabled: schedule.enabled,
                cronLabel: schedule.cron ? (humanCron(schedule.cron) ?? schedule.cron) : null,
                runAt: schedule.runAt,
                timezone: schedule.timezone,
            })),
            ...triggers.map(trigger => ({ kind: 'trigger' as const, slug: trigger.slug, name: trigger.name, enabled: trigger.enabled, cronLabel: null, runAt: null, timezone: null })),
        ],
    }
}

export async function listCoworkerSkills(ctx: WorkspaceContext, agentId: string): Promise<SkillSummariesView> {
    const { conn, engineAgentId } = await resolveAgentTarget(agentId, ctx.workspace.id)
    return { skills: await listSkillSummaries(conn, engineAgentId) }
}

export async function setCoworkerRoutineEnabled(ctx: WorkspaceContext, agentId: string, kind: RoutineKind, slug: string, enabled: boolean): Promise<void> {
    const { conn, engineAgentId } = await resolveAgentTarget(agentId, ctx.workspace.id)
    if (kind === 'schedule') await updateSchedule(conn, engineAgentId, slug, { enabled })
    else await updateTrigger(conn, engineAgentId, slug, { enabled })
}

export async function readCoworkerNotifications(ctx: WorkspaceContext, agentId: string): Promise<CoworkerNotifications> {
    await assertCoworkerOwned(ctx, agentId)
    return { mode: coworkerRuleOf(await readNotificationPrefs(ctx.userId), agentId).mode }
}

// Only the mode moves: whether the caller follows the coworker's scheduled tasks is kept as it was.
export async function setCoworkerNotifications(ctx: WorkspaceContext, agentId: string, mode: CoworkerNotifyMode): Promise<void> {
    await assertCoworkerOwned(ctx, agentId)
    const rule = coworkerRuleOf(await readNotificationPrefs(ctx.userId), agentId)
    await patchNotificationPrefs(ctx.userId, { coworkers: { [agentId]: { ...rule, mode } } })
}

// The engine lists one folder at a time, so the walk is bounded: a coworker that cloned a repository
// must not turn opening its details into hundreds of calls to its Box.
const FILE_WALK = { maxListings: 40, maxDepth: 5, maxFiles: 300 }
const MEDIA_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif', 'avif'])
const SKIPPED_DIRS = new Set(['node_modules'])

const kindOf = (name: string): CoworkerFile['kind'] => (MEDIA_EXTENSIONS.has(name.split('.').pop()?.toLowerCase() ?? '') ? 'media' : 'doc')
const isHidden = (name: string) => name.startsWith('.')

export async function listCoworkerFiles(ctx: WorkspaceContext, agentId: string): Promise<CoworkerFiles> {
    const { conn, engineAgentId } = await resolveAgentTarget(agentId, ctx.workspace.id)
    const base = `/agents/${engineAgentId}/files`
    const files: CoworkerFile[] = []
    let level = ['']
    let listings = 0
    let truncated = false

    for (let depth = 0; level.length > 0; depth++) {
        const budget = FILE_WALK.maxListings - listings
        if (depth >= FILE_WALK.maxDepth || budget <= 0) {
            truncated = true
            break
        }
        if (level.length > budget) truncated = true
        const folders = level.slice(0, budget)
        listings += folders.length
        const listed = await Promise.all(folders.map(async folder => ({ folder, entries: await listFiles(conn, base, folder || '.') })))

        const next: string[] = []
        for (const { folder, entries } of listed) {
            for (const entry of entries) {
                if (isHidden(entry.name)) continue
                const path = folder ? `${folder}/${entry.name}` : entry.name
                if (entry.type === 'dir') {
                    if (!SKIPPED_DIRS.has(entry.name)) next.push(path)
                    continue
                }
                files.push({ path, name: entry.name, size: entry.size, modifiedAt: entry.modifiedAt ?? null, kind: kindOf(entry.name) })
            }
        }
        level = next
    }

    files.sort((a, b) => (b.modifiedAt ?? '').localeCompare(a.modifiedAt ?? ''))
    if (files.length > FILE_WALK.maxFiles) truncated = true
    return { files: files.slice(0, FILE_WALK.maxFiles), truncated }
}
