import { siteContentType, withUtf8Charset } from '@/lib/files/content-type'
import { injectBadge } from '@/lib/published/badge'
import { extractPublishedSlug } from '@/lib/published/host'
import { resolveSitePath, siteObjectKey } from '@/lib/published/site-path'
import { PUBLISHED_BUCKET } from '@/lib/services/publish'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectMaybeSingle } from '@/supabase/supabase-helpers'

// What `<slug>.rerun.site` serves, reached only through the host rewrite in proxy.ts. The bytes
// live in the public `published` bucket, but Storage answers every HTML file as text/plain inside
// a sandbox, so a page has to come through here to render at all.
export const dynamic = 'force-dynamic'

const BASE_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Robots-Tag': 'noindex',
}

function notFound(): Response {
    return new Response('Not found', { status: 404, headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store' } })
}

function isHtml(contentType: string): boolean {
    return contentType.startsWith('text/html')
}

// Video and audio go to Storage directly: it answers the Range requests a player sends, and a
// 14 MB clip has no business transiting through the app server.
function isStreamedMedia(contentType: string): boolean {
    return contentType.startsWith('video/') || contentType.startsWith('audio/')
}

async function serve(slug: string, objectUrl: string, contentType: string): Promise<Response> {
    if (isStreamedMedia(contentType)) return Response.redirect(objectUrl, 302)

    const upstream = await fetch(objectUrl, { cache: 'no-store' })
    if (!upstream.ok || !upstream.body) return notFound()

    const cacheControl = isHtml(contentType) ? 'no-cache' : 'public, max-age=300'
    const headers = { ...BASE_HEADERS, 'Content-Type': contentType, 'Cache-Control': cacheControl }
    if (!isHtml(contentType)) return new Response(upstream.body, { headers })
    return new Response(injectBadge(await upstream.text(), slug), { headers })
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; path?: string[] }> }): Promise<Response> {
    const { slug, path = [] } = await params
    // Reachable on the app host by its internal path too, where agent HTML must never run.
    if (extractPublishedSlug(request.headers.get('host')) !== slug) return notFound()

    const supabase = createServiceRoleClient()
    const { data: row } = await selectMaybeSingle(supabase, 'published_files', ['kind', 'storage_key', 'content_type', 'public_url', 'files'] as const, { slug })
    if (!row) return notFound()

    if (row.kind === 'site') {
        const files = row.files ?? []
        const index = resolveSitePath(path, files)
        if (index === null) return notFound()
        const { data } = supabase.storage.from(PUBLISHED_BUCKET).getPublicUrl(siteObjectKey(row.storage_key, index))
        return serve(slug, data.publicUrl, siteContentType(files[index]))
    }

    if (path.length > 0) return notFound()
    const contentType = withUtf8Charset(row.content_type)
    if (!isHtml(contentType)) return Response.redirect(row.public_url, 302)
    // public_url, not a fresh getPublicUrl: a republish overwrites the same key, and only the
    // version query it carries gets past the Storage CDN's copy of the previous bytes.
    return serve(slug, row.public_url, contentType)
}
