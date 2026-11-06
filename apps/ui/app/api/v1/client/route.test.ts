import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/supabase/server', () => ({
    createClient: async () => {
        throw new Error('a public route never builds a Supabase client')
    },
    getRequestAccessToken: async () => null,
}))

const { GET } = await import('./route')

const segment = { params: Promise.resolve({}) }

async function minBuild(): Promise<number> {
    const res = await GET(new Request('https://app.rerun.build/api/v1/client'), segment)
    expect(res.status).toBe(200)
    return (await res.json()).minBuild
}

describe('GET /api/v1/client', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('answers without a signed-in caller, so the version gate runs before sign-in', async () => {
        vi.stubEnv('MOBILE_IOS_MIN_BUILD', '12')
        expect(await minBuild()).toBe(12)
    })

    it('lets every build through when the variable is unset or unreadable', async () => {
        vi.stubEnv('MOBILE_IOS_MIN_BUILD', '')
        expect(await minBuild()).toBe(0)
        vi.stubEnv('MOBILE_IOS_MIN_BUILD', 'twelve')
        expect(await minBuild()).toBe(0)
    })
})
