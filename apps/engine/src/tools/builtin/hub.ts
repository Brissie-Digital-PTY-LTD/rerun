import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import type { RunContext } from '../../runtime/context.js'
import { callHub } from '../../runtime/hub.js'

export function hubTools(ctx: RunContext): ToolSet {
    const call = (name: string, args: Record<string, unknown>) => callHub(ctx.agent, name, args)
    return {
        rerun_hub_service_search: tool({
            description:
                'Semantic search over the Rerun service library (Stripe, Gmail, Figma, Metricool, …) for capabilities you can install on yourself. ALWAYS call this FIRST, before building any new integration or app yourself — describe the capability you need in natural language (e.g. "schedule social media posts") and it returns the most relevant ready-made services, ranked, with whether each is already installed. If nothing relevant comes back, the library does not handle it — build the capability yourself. Finding a service is not a reason to ask the user to connect it yet.',
            inputSchema: z.object({
                query: z.string().describe('Natural-language description of the capability you need (matched semantically, not just by keyword).'),
                category: z.string().optional().describe('Optional category filter.'),
            }),
            execute: ({ query, category }) => call('service_search', { query, category }),
        }),
        rerun_hub_service_details: tool({
            description: 'Get the full details of a service: what it does and which inputs/credentials it needs to be configured.',
            inputSchema: z.object({ slug: z.string() }),
            execute: ({ slug }) => call('service_details', { slug }),
        }),
        rerun_hub_service_install: tool({
            description:
                'Install a service on yourself directly. Use this ONLY for a service that needs no credentials, or when you already hold every required value. If the service needs credentials or a sign-in, do NOT use this — call suggest_service instead so the user sets it up in a card. Returns status "installed" when the service is ready to use; its tools become available on your next turn.',
            inputSchema: z.object({
                slug: z.string(),
                values: z.record(z.string(), z.string()).optional().describe('Optional NON-secret input values to apply directly (e.g. a region or account name).'),
            }),
            execute: ({ slug, values }) => call('service_install', { slug, values }),
        }),
        rerun_hub_service_list_installed: tool({
            description: 'List the services currently installed on you and their status.',
            inputSchema: z.object({}),
            execute: () => call('service_list_installed', {}),
        }),
        rerun_hub_service_uninstall: tool({
            description: 'Uninstall a service from yourself. Removes everything it added (its tools, credentials and usage skill). Use when a capability is no longer needed.',
            inputSchema: z.object({ slug: z.string() }),
            execute: ({ slug }) => call('service_uninstall', { slug }),
        }),
        rerun_hub_publish_file: tool({
            description:
                'Publish a file or folder from your workspace to a PUBLIC URL anyone can open in a browser. Use it whenever the user needs to see, open, download or share something you produced (a page or site you built, a report, a chart, a PDF, an export) instead of saying it is in your workspace. Returns the URL to share. The file is served as-is, so make sure it is final. An HTML page, site or mini-app gets its own address (https://<slug>.rerun.site) with its scripts, localStorage and a small "Made with Rerun" badge. For more than one self-contained page, publish the FOLDER with an index.html at its root: every file in it is published and relative paths resolve, so never inline images as base64. Re-publishing the same path keeps the same URL.',
            inputSchema: z.object({
                path: z.string().describe('Path to the file or folder in your workspace, e.g. "reports/q2.pdf" or "sites/launch" (a folder needs an index.html at its root).'),
                slug: z.string().optional().describe('Optional readable name for the public URL (lowercase letters, digits and hyphens, starting with a letter or digit). A short random suffix is always appended, e.g. "q2-report" gives "q2-report-k3m9xqw7pt". If omitted, a fully random one is generated. Always share the URL returned, never guess it.'),
            }),
            execute: ({ path, slug }) => call('publish_file', { path, slug }),
        }),
        rerun_hub_unpublish_file: tool({
            description: 'Remove a file you previously published: deletes the public copy and makes its URL return 404. Identify it by the workspace path you published, or by its slug.',
            inputSchema: z.object({
                path: z.string().optional().describe('The workspace path you originally published.'),
                slug: z.string().optional().describe('Or the slug of the published file.'),
            }),
            execute: ({ path, slug }) => call('unpublish_file', { path, slug }),
        }),
        rerun_hub_list_published: tool({
            description: 'List the files you currently have published, with their public URLs and original workspace paths.',
            inputSchema: z.object({}),
            execute: () => call('list_published', {}),
        }),
    }
}
