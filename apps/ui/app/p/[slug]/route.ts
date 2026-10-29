import { publishedSiteOrigin, rendersAsPage } from '@/lib/published/host'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectMaybeSingle } from '@/supabase/supabase-helpers'

// Friendly public URL for a published file (see lib/services/publish.ts). Resolves the slug
// to its row and 302-redirects to the stored Storage URL. Public by design — that's the point
// of publishing. If the row is gone (unpublished), return 404: this is what makes unpublish a
// real revocation, even though raw Storage public URLs are otherwise permanent.
// A page or a site goes to <slug>.rerun.site instead, Storage would show its source as text.
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
    const { slug } = await params
    const supabase = createServiceRoleClient()
    const { data } = await selectMaybeSingle(supabase, 'published_files', ['public_url', 'kind', 'content_type'] as const, { slug })
    if (!data?.public_url) {
        return new Response('Not found', { status: 404 })
    }
    const siteOrigin = rendersAsPage(data.kind, data.content_type) ? publishedSiteOrigin(slug) : null
    return Response.redirect(siteOrigin ?? data.public_url, 302)
}
