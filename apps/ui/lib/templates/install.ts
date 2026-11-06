import type { SupabaseClient } from '@supabase/supabase-js'
import type { TemplateAgent } from '@rerun/contracts'
import type { Actor } from '@/app/api/_auth/access'
import type { Database } from '@/app/api/database.types'
import { createAgent, deriveUniqueHandles, importAgent } from '@/app/api/_services/agent.service'
import { installServiceSlugs } from '@/app/api/_services/agent-setup.service'
import { getSpaceConnection } from '@/app/api/_services/space.service'
import { createSchedule as engineCreateSchedule, importSkill as engineImportSkill } from '@/lib/engine/client'
import { selectMany, selectSingle } from '@/supabase/supabase-helpers'
import { downloadPrivateFile } from '@/lib/storage/private'
import { STALE_IMPORT_HINT } from '@/lib/agents/capture-archive'
import { agentsFromRow } from './document'
import { AGENT_ARCHIVE_BUCKET, archiveAgentNames, archivesFromRow } from './archives'
import { AGENT_SPAN, containerContainsTile } from '@/lib/board/iso'
import type { GridPosition } from '@/lib/board/types'

// The public catalogue withholds the captured archives, so a template can arrive without one.
// Rather than leave its cards dead, the coworker is built from the template's own document: its
// name, role, skills, schedules and apps. The soul is written from that same text, which is what
// lets a card keep its promise without the original prompt.
function soulFromAgent(agent: TemplateAgent): string {
    const parts = [`# ${agent.name}`]
    const intro = [agent.role, agent.description].filter(Boolean).join('\n\n')
    if (intro) parts.push(intro)
    if (agent.skills.length > 0) {
        parts.push('## Skills', 'Use the skill that matches the moment:', ...agent.skills.map(skill => `- **${skill.name}** — ${skill.description}`))
    }
    if (agent.schedules.length > 0) {
        parts.push('## Scheduled work', ...agent.schedules.map(schedule => `- ${schedule.name} (${schedule.cron})`))
    }
    parts.push('## Ground rules', '- Ask before anything that spends money, sends something outside the workspace, or deletes data.', '- Say what you checked and what still needs a human decision.')
    return parts.join('\n\n')
}

function skillBodyFromDescription(skill: { name: string; description: string }): string {
    return `---\n---\n\n# ${skill.name}\n\n${skill.description}\n\n## Steps\n1. Gather what the task needs from the workspace and the apps this coworker can reach.\n2. Do the work the description asks for in small, verifiable steps.\n3. Report what changed, what you verified, and what still needs a human decision.\n`
}


// Narrower than the shared `isMissingRoute`: only the import route being absent means the whole
// batch is doomed, a 404 on anything else is about this one archive.
function isMissingImportRoute(err: unknown): boolean {
    return err instanceof Error && /\/agents\/import failed: 404/.test(err.message)
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : 'Unknown error'
}

// `inactive` counts the agents that landed switched off because the plan had no slot left for
// them. They are installed and complete, they just will not run until a slot frees up.
// `alreadyInstalled`: the workspace had this template's coworkers already, and `agentIds` are those.
export type TemplateInstallOutcome = { imported: number; inactive: number; agentIds: string[]; failed: { name: string; error: string }[]; warnings: string[]; alreadyInstalled: boolean }

// The anchors come from the client, so they are treated as a preference rather than a fact: one
// that does not fit inside the target space is dropped, and that agent falls back to the free cell
// the server picks for it.
async function anchorsInsideSpace(supabase: SupabaseClient<Database>, spaceId: string, positions: GridPosition[] | undefined): Promise<(GridPosition | undefined)[]> {
    if (!positions?.length) return []
    const { data: space } = await selectSingle(supabase, 'spaces', ['col_start', 'row_start', 'col_end', 'row_end'] as const, { id: spaceId })
    if (!space) return []

    return positions.map(p => (containerContainsTile(space, p, AGENT_SPAN) ? p : undefined))
}

// The mirror of capture.ts: capture archives a folder, install unpacks it back into a space.
// Nothing here reads the tarball. The engine is the only side that opens it, so the connectors an
// imported agent still needs are the ones its own registry already declares as needing auth, and
// the Services tab renders them with nothing new to build.
export async function installTemplate(supabase: SupabaseClient<Database>, slug: string, target: { workspaceId: number; spaceId: string; actor: Actor; positions?: GridPosition[]; again?: boolean }): Promise<TemplateInstallOutcome> {
    const { data: template } = await selectSingle(supabase, 'templates', ['id', 'title', 'agents', 'agent_archives'] as const, { slug })
    if (!template) throw new Error(`No template found with slug "${slug}"`)

    // A replayed install (the foreman calling twice, a retry after checkout, a second tab) would land
    // a second team with the same names, each asking to be set up from scratch, so the workspace
    // gets back the coworkers it already has. Only the user's explicit "Install again" sets `again`.
    if (!target.again) {
        const { data: installed } = await selectMany(supabase, 'agents', ['id'] as const, { workspace_id: target.workspaceId, template_id: template.id }, { column: 'created_at' })
        if (installed?.length) return { imported: 0, inactive: 0, agentIds: installed.map(agent => agent.id), failed: [], warnings: [], alreadyInstalled: true }
    }

    const agents = agentsFromRow.parse(template.agents)
    const archives = archivesFromRow.parse(template.agent_archives)
    if (archives.length === 0) return installFromDocument(supabase, template, target, agents)


    // Named after the editorial entry when there is one, so an admin's rename of a captured agent
    // is what the importer sees.
    const names = archiveAgentNames(archives, agents)
    const handles = await deriveUniqueHandles(supabase, target.workspaceId, names)
    const anchors = await anchorsInsideSpace(supabase, target.spaceId, target.positions)

    const failed: TemplateInstallOutcome['failed'] = []
    const warnings: string[] = []
    const agentIds: string[] = []
    let imported = 0
    let inactive = 0

    for (const [index, archive] of archives.entries()) {
        try {
            const blob = await downloadPrivateFile(supabase, AGENT_ARCHIVE_BUCKET, archive.path)
            // The template id rides along so a revoked purchase can name the agents it installed.
            const { agent, imported: result } = await importAgent({
                archive: blob,
                name: names[index],
                handle: handles[index],
                workspaceId: target.workspaceId,
                spaceId: target.spaceId,
                actor: target.actor,
                position: anchors[index],
                templateId: template.id,
            })
            imported += 1
            if (agent.disabled_at) inactive += 1
            agentIds.push(agent.id)
            // The engine is the only side that opens the tarball, so a refused entry is the one
            // thing about the copy the caller cannot see for itself.
            if (result.skippedPaths.length > 0) warnings.push(`"${names[index]}": ${result.skippedPaths.length} file(s) in the archive were refused (${result.skippedPaths.slice(0, 3).join(', ')}).`)
            // The copy answers to webhook addresses of its own, and nothing else will say so: the
            // template author's URLs stayed on their box.
            if (result.triggers.length > 0) {
                warnings.push(`"${names[index]}": ${result.triggers.length} webhook(s) were created with a new URL each (${result.triggers.join(', ')}). Read them in the coworker panel and point your services at them.`)
            }
        } catch (err) {
            // An engine too old to answer this route will fail on every agent, so it is worth
            // stopping on. Anything else is about this one archive: there is no transaction
            // between Supabase and the engine, and an agent that already landed is real and
            // visible on the grid, so the rest of the batch carries on and reports what failed.
            if (isMissingImportRoute(err)) throw new Error(STALE_IMPORT_HINT)
            failed.push({ name: names[index], error: errorMessage(err) })
        }
    }

    if (imported === 0) throw new Error(failed[0]?.error ?? `"${template.title}" imported no coworker.`)

    return { imported, inactive, agentIds, failed, warnings, alreadyInstalled: false }
}

// The archive-free path: the same outcome as an import, assembled from the template document.
// Each coworker is a real agent on the workspace engine (soul, skills, scheduled tasks, apps),
// so everything downstream — the chat, the skills panel, the connectors checklist — works the
// same. The original prompt and skill text are not reproduced: those never leave Rerun Cloud,
// and the warning says so on every install.
async function installFromDocument(
    supabase: SupabaseClient<Database>,
    template: { title: string },
    target: { workspaceId: number; spaceId: string; actor: Actor; positions?: GridPosition[]; again?: boolean },
    agents: TemplateAgent[],
): Promise<TemplateInstallOutcome> {
    const names = agents.map(agent => agent.name)
    const handles = await deriveUniqueHandles(supabase, target.workspaceId, names)
    const anchors = await anchorsInsideSpace(supabase, target.spaceId, target.positions)
    const conn = await getSpaceConnection(target.spaceId)

    const failed: TemplateInstallOutcome['failed'] = []
    const warnings: string[] = [`"${template.title}" carries no captured archive here: each coworker was built from the template's public description, so its original prompt and skill text are not reproduced.`]
    const agentIds: string[] = []
    let imported = 0
    let inactive = 0

    for (const [index, doc] of agents.entries()) {
        try {
            const agent = await createAgent({
                name: doc.name,
                description: doc.description || doc.role || undefined,
                soulMd: soulFromAgent(doc),
                workspaceId: target.workspaceId,
                spaceId: target.spaceId,
                actor: target.actor,
                position: anchors[index],
                handle: handles[index],
            })

            // The agent itself is real from here on. A skill or schedule the engine refuses is
            // reported rather than undoing the coworker: a partial install is still usable.
            try {
                if (doc.connectorSlugs.length > 0) await installServiceSlugs(agent.id, doc.connectorSlugs, target.actor)
                for (const skill of doc.skills) {
                    await engineImportSkill(conn, agent.engine_agent_id, skillBodyFromDescription(skill), [], { name: skill.name, description: skill.description })
                }
                for (const schedule of doc.schedules) {
                    if (!schedule.cron) continue
                    await engineCreateSchedule(conn, agent.engine_agent_id, {
                        name: schedule.name,
                        body: `Run the "${schedule.name}" task for this coworker.`,
                        cron: schedule.cron,
                        // A template's schedule arrives switched off, like an imported one whose
                        // owner moved it: the first run is the user's decision.
                        enabled: false,
                    })
                }
            } catch (err) {
                warnings.push(`"${doc.name}": ${errorMessage(err)}`)
            }

            imported += 1
            if (agent.disabled_at) inactive += 1
            agentIds.push(agent.id)
        } catch (err) {
            failed.push({ name: doc.name, error: errorMessage(err) })
        }
    }

    if (imported === 0) throw new Error(failed[0]?.error ?? `"${template.title}" imported no coworker.`)

    return { imported, inactive, agentIds, failed, warnings, alreadyInstalled: false }
}
