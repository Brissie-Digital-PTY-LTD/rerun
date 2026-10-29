import { getSpaceConnection } from '@/app/api/_services/space.service'
import type { Database } from '@/app/api/database.types'
import { fetchRawFile, listFiles } from '@/lib/engine/client'
import { siteContentType, withUtf8Charset } from '@/lib/files/content-type'
import type { EngineConnection } from '@/lib/engine/types'
import { isOpaqueToken, opaqueToken } from '@/lib/opaque-token'
import { PUBLISHED_SLUG_TOKEN_LENGTH, publishedSiteOrigin, rendersAsPage, slugPrefix, suffixedSlug } from '@/lib/published/host'
import { siteObjectKey } from '@/lib/published/site-path'
import { hubBaseUrl } from '@/lib/services/hub'
import type { PublishResult, PublishedFile } from '@/lib/services/types'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectMany, selectMaybeSingle, selectSingle } from '@/supabase/supabase-helpers'

// Public file publishing. An agent publishes a file from its engine workspace; the bytes are
// copied server-to-server (engine /raw → Supabase Storage), NEVER through the LLM context.
// A `published_files` row records the mapping and the public identity (slug). The friendly
// URL is /p/<slug> (see app/p/[slug]/route.ts), which 302s to the stored Storage URL — so
// removing the row truly revokes the link. Upload pattern mirrors lib/services/brand-icon.ts.
// HTML pages and whole folders are served from <slug>.rerun.site instead (lib/published/host.ts),
// since Storage refuses to render HTML.

export const PUBLISHED_BUCKET = 'published'
const MAX_PUBLISH_BYTES = 25 * 1024 * 1024 // 25 MB — keep well under Storage's per-object limit.
const MAX_SITE_FILES = 300
const MAX_SITE_DEPTH = 8
const MAX_SITE_BYTES = 50 * 1024 * 1024
const SITE_UPLOAD_CONCURRENCY = 8
const SITE_ENTRY = 'index.html'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

type AgentContext = {
    engineAgentId: string
    spaceId: string
    workspaceId: number
    conn: EngineConnection
}

// Resolve the calling agent (trusted: agentId comes from the Hub-authenticated x-rerun-agent
// header) to its engine connection + the workspace/space ids used for keying and isolation.
// Dedicated resolver on purpose: getAgentChatTarget doesn't expose workspace_id/space_id.
async function resolveAgent(agentId: string): Promise<AgentContext> {
    const supabase = createServiceRoleClient()
    const { data: agent } = await selectSingle(supabase, 'agents', ['engine_agent_id', 'space_id', 'workspace_id'] as const, { id: agentId })
    if (!agent?.engine_agent_id) throw new Error('Coworker not configured or not found')
    const conn = await getSpaceConnection(agent.space_id)
    return { engineAgentId: agent.engine_agent_id, spaceId: agent.space_id, workspaceId: agent.workspace_id, conn }
}

async function ensureBucket(supabase: ServiceClient): Promise<void> {
    await supabase.storage.createBucket(PUBLISHED_BUCKET, { public: true }).catch(() => {}) // idempotent
}

function fileNameOf(path: string): string {
    return path.split(/[\\/]/).pop() || 'file'
}

type PublishedKind = 'file' | 'site'
type PublishedObjects = { kind: string; storage_key: string; files: string[] | null }

// Key bytes by workspace + slug + original filename, so re-publishing a different file under a
// new slug never collides, and the browser sees a sensible filename.
function storageKeyFor(workspaceId: number, slug: string, path: string): string {
    return `${workspaceId}/${slug}/${fileNameOf(path)}`
}

function friendlyUrlFor(slug: string): string {
    return `${hubBaseUrl()}/p/${slug}`
}

function shareUrlFor(slug: string, kind: string, contentType: string): string {
    return (rendersAsPage(kind, contentType) && publishedSiteOrigin(slug)) || friendlyUrlFor(slug)
}

function storageKeysOf(row: PublishedObjects): string[] {
    if (row.kind !== 'site') return [row.storage_key]
    return (row.files ?? []).map((_, index) => siteObjectKey(row.storage_key, index))
}

async function generateFreeSlug(supabase: ServiceClient, customSlug?: string): Promise<string> {
    for (let i = 0; i < 5; i++) {
        const token = opaqueToken(PUBLISHED_SLUG_TOKEN_LENGTH)
        const slug = customSlug ? suffixedSlug(customSlug, token) : token
        const { data } = await selectMaybeSingle(supabase, 'published_files', ['slug'] as const, { slug })
        if (!data) return slug
    }
    throw new Error('Could not generate a unique slug, please try again')
}

// The coworker may pass back the name it chose or the full slug it was given: either way, a
// republish keeps its URL. Links published before the suffix existed keep theirs too. A full slug
// given for a path with no row left (unpublished, or another file) is re-suffixed once, never twice.
function isSameCustomSlug(existingSlug: string, customSlug: string): boolean {
    if (existingSlug === customSlug.trim().toLowerCase()) return true
    const prefix = slugPrefix(customSlug)
    return existingSlug.startsWith(`${prefix}-`) && isOpaqueToken(existingSlug.slice(prefix.length + 1), PUBLISHED_SLUG_TOKEN_LENGTH)
}

function joinPath(dir: string, name: string): string {
    return dir === '.' || dir === '' ? name : `${dir}/${name}`
}

async function isDirectory(conn: EngineConnection, base: string, path: string): Promise<boolean> {
    if (path === '.') return true
    const slash = path.lastIndexOf('/')
    const parent = slash === -1 ? '.' : path.slice(0, slash)
    const entries = await listFiles(conn, base, parent)
    return entries.some(entry => entry.name === path.slice(slash + 1) && entry.type === 'dir')
}

// Every file of a folder about to be published, as paths relative to it. Dotfiles, .git and
// node_modules are a project's plumbing, never part of what a visitor should be able to fetch.
async function listSiteFiles(conn: EngineConnection, base: string, root: string): Promise<string[]> {
    const files: string[] = []
    let totalBytes = 0
    const walk = async (rel: string, depth: number): Promise<void> => {
        if (depth > MAX_SITE_DEPTH) throw new Error(`Folder is nested too deep to publish (max ${MAX_SITE_DEPTH} levels).`)
        for (const entry of await listFiles(conn, base, joinPath(root, rel))) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
            const entryRel = joinPath(rel, entry.name)
            if (entry.type === 'dir') {
                await walk(entryRel, depth + 1)
                continue
            }
            if (entry.size > MAX_PUBLISH_BYTES) throw new Error(`File too large to publish: ${entryRel} (max ${MAX_PUBLISH_BYTES / 1024 / 1024} MB per file).`)
            totalBytes += entry.size
            files.push(entryRel)
            if (files.length > MAX_SITE_FILES) throw new Error(`Folder has too many files to publish (max ${MAX_SITE_FILES}).`)
            if (totalBytes > MAX_SITE_BYTES) throw new Error(`Folder too large to publish (max ${MAX_SITE_BYTES / 1024 / 1024} MB in total).`)
        }
    }
    await walk('', 0)
    if (!files.includes(SITE_ENTRY)) throw new Error(`A published folder needs an ${SITE_ENTRY} at its root: ${root}`)
    return files
}

async function readWorkspaceFile(conn: EngineConnection, base: string, path: string): Promise<Response> {
    const res = await fetchRawFile(conn, base, path)
    if (res.status === 404) throw new Error(`File not found in workspace: ${path}`)
    if (!res.ok) throw new Error(`Failed to read file from engine: ${res.status}`)
    return res
}

async function uploadObject(supabase: ServiceClient, key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    const { error } = await supabase.storage.from(PUBLISHED_BUCKET).upload(key, bytes, { contentType, upsert: true })
    if (error) throw new Error(`Storage upload failed: ${error.message}`)
}

type UploadedObjects = { kind: PublishedKind; storageKey: string; files: string[] | null; contentType: string; size: number; publicUrl: string }

async function uploadFile(supabase: ServiceClient, conn: EngineConnection, base: string, path: string, storageKey: string): Promise<UploadedObjects> {
    const res = await readWorkspaceFile(conn, base, path)
    const contentType = withUtf8Charset(res.headers.get('Content-Type') ?? 'application/octet-stream')
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength === 0) throw new Error(`File is empty: ${path}`)
    if (bytes.byteLength > MAX_PUBLISH_BYTES) {
        throw new Error(`File too large to publish (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB; max ${MAX_PUBLISH_BYTES / 1024 / 1024} MB).`)
    }
    await uploadObject(supabase, storageKey, bytes, contentType)
    const { data: pub } = supabase.storage.from(PUBLISHED_BUCKET).getPublicUrl(storageKey)
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}` // cache-bust so republished bytes are served
    return { kind: 'file', storageKey, files: null, contentType, size: bytes.byteLength, publicUrl }
}

// A folder goes under a fresh prefix on every publish, and each file under its index in the
// manifest rather than its own name: the row only switches to the new prefix once every upload
// landed, so a republish never serves half a site, and no file name can trip Storage's key rules.
async function uploadSite(supabase: ServiceClient, conn: EngineConnection, base: string, root: string, prefix: string): Promise<UploadedObjects> {
    const files = await listSiteFiles(conn, base, root)
    let size = 0
    let next = 0
    const worker = async (): Promise<void> => {
        while (next < files.length) {
            const index = next++
            const res = await readWorkspaceFile(conn, base, joinPath(root, files[index]))
            const bytes = new Uint8Array(await res.arrayBuffer())
            size += bytes.byteLength
            await uploadObject(supabase, siteObjectKey(prefix, index), bytes, siteContentType(files[index]))
        }
    }
    try {
        await Promise.all(Array.from({ length: Math.min(SITE_UPLOAD_CONCURRENCY, files.length) }, worker))
    } catch (err) {
        await supabase.storage.from(PUBLISHED_BUCKET).remove(files.map((_, index) => siteObjectKey(prefix, index))).catch(() => {})
        throw err
    }
    const { data: pub } = supabase.storage.from(PUBLISHED_BUCKET).getPublicUrl(siteObjectKey(prefix, files.indexOf(SITE_ENTRY)))
    return { kind: 'site', storageKey: prefix, files, contentType: siteContentType(SITE_ENTRY), size, publicUrl: pub.publicUrl }
}

// Publish a workspace file, or a folder with an index.html served as a site, to a public URL.
// Re-publishing the same path upserts in place and keeps the existing slug/URL (unless a new slug
// is given).
export async function publishFile(agentId: string, path: string, customSlug?: string): Promise<PublishResult> {
    const cleanPath = path.trim().replace(/(.)\/+$/, '$1')
    if (!cleanPath) throw new Error('Missing required argument: path')

    const { engineAgentId, spaceId, workspaceId, conn } = await resolveAgent(agentId)
    const supabase = createServiceRoleClient()
    const base = `/agents/${engineAgentId}/files`

    // Already published by this agent under this path? → republish in place (stable URL).
    const { data: existing } = await selectMaybeSingle(
        supabase,
        'published_files',
        ['slug', 'kind', 'storage_key', 'files'] as const,
        { agent_id: agentId, source_path: cleanPath },
    )

    const keepsExistingSlug = existing && (!customSlug || isSameCustomSlug(existing.slug, customSlug))
    const slug = keepsExistingSlug ? existing.slug : await generateFreeSlug(supabase, customSlug)

    // The bytes go engine → Storage server-to-server, never through the LLM context.
    await ensureBucket(supabase)
    const uploaded = (await isDirectory(conn, base, cleanPath))
        ? await uploadSite(supabase, conn, base, cleanPath, `${workspaceId}/${slug}/site-${Date.now()}`)
        : await uploadFile(supabase, conn, base, cleanPath, storageKeyFor(workspaceId, slug, cleanPath))

    const row: Database['public']['Tables']['published_files']['Insert'] = {
        workspace_id: workspaceId,
        space_id: spaceId,
        agent_id: agentId,
        source_path: cleanPath,
        storage_key: uploaded.storageKey,
        kind: uploaded.kind,
        files: uploaded.files,
        content_type: uploaded.contentType,
        size: uploaded.size,
        public_url: uploaded.publicUrl,
        slug,
        updated_at: new Date().toISOString(),
    }
    const { error: rowErr } = await supabase
        .from('published_files')
        .upsert<Database['public']['Tables']['published_files']['Insert']>(row, { onConflict: 'agent_id,source_path' })
    if (rowErr) throw new Error(`Failed to record published file: ${rowErr.message}`)

    // Whatever the previous publish left behind and this one no longer points at.
    if (existing) {
        const current = new Set(storageKeysOf({ kind: uploaded.kind, storage_key: uploaded.storageKey, files: uploaded.files }))
        const stale = storageKeysOf(existing).filter(key => !current.has(key))
        if (stale.length > 0) await supabase.storage.from(PUBLISHED_BUCKET).remove(stale).catch(() => {})
    }

    return {
        status: 'published',
        url: shareUrlFor(slug, uploaded.kind, uploaded.contentType),
        publicUrl: uploaded.publicUrl,
        slug,
        path: cleanPath,
        kind: uploaded.kind,
        contentType: uploaded.contentType,
        size: uploaded.size,
    }
}

// Remove a published file: delete the Storage object first (tolerate already-gone), then the
// row — so /p/<slug> returns 404 immediately afterwards. Scoped to the agent: an agent can
// only unpublish its own files.
export async function unpublishFile(agentId: string, ident: { path?: string; slug?: string }): Promise<{ status: 'unpublished'; slug: string; path: string }> {
    const path = ident.path?.trim()
    const slug = ident.slug?.trim()
    if (!path && !slug) throw new Error('Provide either path or slug to unpublish')

    const supabase = createServiceRoleClient()
    const filters = slug ? { agent_id: agentId, slug } : { agent_id: agentId, source_path: path as string }
    const { data: rowData } = await selectMaybeSingle(supabase, 'published_files', ['id', 'slug', 'source_path', 'kind', 'storage_key', 'files'] as const, filters)
    if (!rowData) throw new Error(slug ? `No published file with slug: ${slug}` : `No published file for path: ${path}`)

    await supabase.storage.from(PUBLISHED_BUCKET).remove(storageKeysOf(rowData)).catch(() => {})
    const { error } = await supabase.from('published_files').delete().eq('id', rowData.id)
    if (error) throw new Error(`Failed to unpublish: ${error.message}`)

    return { status: 'unpublished', slug: rowData.slug, path: rowData.source_path }
}

// List the files this agent currently has published.
export async function listPublished(agentId: string): Promise<{ files: PublishedFile[] }> {
    const supabase = createServiceRoleClient()
    const { data } = await selectMany(
        supabase,
        'published_files',
        ['slug', 'source_path', 'kind', 'content_type', 'size', 'created_at', 'updated_at'] as const,
        { agent_id: agentId },
        { column: 'updated_at', ascending: false },
    )
    const files = (data ?? []).map(r => ({
        slug: r.slug,
        path: r.source_path,
        url: shareUrlFor(r.slug, r.kind, r.content_type),
        contentType: r.content_type,
        size: r.size,
        publishedAt: r.created_at,
        updatedAt: r.updated_at,
    }))
    return { files }
}
