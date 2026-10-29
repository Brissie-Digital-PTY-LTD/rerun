import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const edition = vi.hoisted(() => ({ rerunCloud: true }))
vi.mock('@/cloud/edition', () => ({ get RERUN_CLOUD() { return edition.rerunCloud } }))

const { verifyTurnstile } = await import('./turnstile')

const fetchMock = vi.fn()

const answers = (body: object) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }))

beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('verifyTurnstile', () => {
    it('accepts a token Cloudflare vouches for', async () => {
        answers({ success: true })

        expect(await verifyTurnstile('token', '203.0.113.7')).toBe(true)

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
        expect(JSON.parse(init.body as string)).toEqual({ secret: 'secret', response: 'token', remoteip: '203.0.113.7' })
    })

    it('refuses a token Cloudflare rejects', async () => {
        answers({ success: false, 'error-codes': ['invalid-input-response'] })

        expect(await verifyTurnstile('token', '203.0.113.7')).toBe(false)
    })

    it('refuses a request that carries no token, without asking Cloudflare', async () => {
        expect(await verifyTurnstile(undefined, '203.0.113.7')).toBe(false)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('refuses when Cloudflare cannot be reached', async () => {
        fetchMock.mockRejectedValue(new Error('down'))

        expect(await verifyTurnstile('token', '203.0.113.7')).toBe(false)
    })

    it('lets everyone through on a local stack that has no secret', async () => {
        vi.stubEnv('TURNSTILE_SECRET_KEY', '')
        vi.stubEnv('NODE_ENV', 'development')

        expect(await verifyTurnstile(undefined, '203.0.113.7')).toBe(true)
    })

    it('lets nobody through in production when the secret is missing', async () => {
        vi.stubEnv('TURNSTILE_SECRET_KEY', '')
        vi.stubEnv('NODE_ENV', 'production')

        expect(await verifyTurnstile('token', '203.0.113.7')).toBe(false)
    })

    it('lets everyone through on a self-hosted install that set no captcha', async () => {
        vi.stubEnv('TURNSTILE_SECRET_KEY', '')
        vi.stubEnv('NODE_ENV', 'production')
        edition.rerunCloud = false

        expect(await verifyTurnstile(undefined, '203.0.113.7')).toBe(true)
        edition.rerunCloud = true
    })
})
