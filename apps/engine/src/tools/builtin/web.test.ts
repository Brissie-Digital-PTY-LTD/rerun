import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

process.env.RERUN_DATA_DIR = mkdtempSync(resolve(tmpdir(), 'rerun-web-'))

const { afterEach, describe, expect, it, vi } = await import('vitest')
const { HostBreaker, BLOCKED_SOURCE_PREFIX } = await import('../host-breaker.js')
const { webTools } = await import('./web.js')

const originalFetch = globalThis.fetch

function ctxWith() {
    return { agent: { id: 'surfer', env: {}, config: { tools: { paidData: false } } }, sessionId: 's', logger: { warn: () => {} }, hostBreaker: new HostBreaker() } as any
}

// The line saying where the whole page is saved is asserted on its own, in the saved-page tests.
const withoutSavedLine = (text: string): string => text.replace(/\nSaved whole: [^\n]*/, '')

async function fetchPage(ctx: ReturnType<typeof ctxWith>, url: string, timeoutMs?: number): Promise<string> {
    return withoutSavedLine((await (webTools(ctx, timeoutMs).web_fetch as any).execute({ url, raw: false }, { toolCallId: 'call-1', messages: [] })) as string)
}

afterEach(() => {
    globalThis.fetch = originalFetch
})

describe('web_search description', () => {
    it('points at paid_data for people and company data only when the coworker can buy it', () => {
        const withPaidData = (webTools({ ...ctxWith(), agent: { id: 'surfer', env: {}, config: { tools: { paidData: true } } } }).web_search as any).description as string
        expect(withPaidData).toContain('use paid_data instead')
        expect(withPaidData.length).toBeLessThan(1000)
        expect((webTools(ctxWith()).web_search as any).description).not.toContain('paid_data')
    })
})

describe('web_fetch', () => {
    it('closes a host after three refused attempts and stops fetching it', async () => {
        const fetchMock = vi.fn(async () => new Response('<h1>Forbidden</h1>', { status: 403 }))
        globalThis.fetch = fetchMock as unknown as typeof fetch
        const ctx = ctxWith()
        expect(await fetchPage(ctx, 'https://www.reddit.com/r/startups.json')).toContain('[attempt 1/3 on reddit.com failed in this run]')
        await fetchPage(ctx, 'https://reddit.com/r/startups')
        expect(await fetchPage(ctx, 'https://www.reddit.com/r/startups')).toContain(BLOCKED_SOURCE_PREFIX)
        expect(await fetchPage(ctx, 'https://reddit.com/r/startups')).toMatch(new RegExp(`^${BLOCKED_SOURCE_PREFIX} reddit.com`))
        expect(fetchMock).toHaveBeenCalledTimes(3)
        expect(await fetchPage(ctx, 'https://old.reddit.com/r/startups')).toContain('[attempt 1/3 on old.reddit.com failed in this run]')
    })

    it('returns a string instead of throwing on a network error', async () => {
        globalThis.fetch = vi.fn(async () => {
            throw new Error('getaddrinfo ENOTFOUND nowhere.test')
        }) as unknown as typeof fetch
        expect(await fetchPage(ctxWith(), 'https://nowhere.test/')).toBe("Fetch failed: getaddrinfo ENOTFOUND nowhere.test (https://nowhere.test/). This is Rerun's reader failing, not proof that the site is down.\n\n[attempt 1/3 on nowhere.test failed in this run]")
    })

    it('gives up on a fetch that never answers', async () => {
        globalThis.fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason)))) as unknown as typeof fetch
        expect(await fetchPage(ctxWith(), 'https://slow.test/page', 50)).toContain('Fetch failed: timed out after 0 s (https://slow.test/page)')
    })

    it('says that a refusal went to Rerun, not to Google', async () => {
        globalThis.fetch = vi.fn(async () => new Response('denied', { status: 403 })) as unknown as typeof fetch
        expect(await fetchPage(ctxWith(), 'https://repeg.test/')).toMatch(/^\[403\] https:\/\/repeg\.test\/ \(sent to Rerun's reader: not proof that Google or visitors get the same\)\n\ndenied/)
    })

    it('does not count a missing page against the host', async () => {
        globalThis.fetch = vi.fn(async () => new Response('gone', { status: 404 })) as unknown as typeof fetch
        expect(await fetchPage(ctxWith(), 'https://example.com/missing')).toBe('[404] https://example.com/missing (no page here: if you guessed this URL instead of following a link, that is not proof of a broken page)\n\ngone')
    })
})
