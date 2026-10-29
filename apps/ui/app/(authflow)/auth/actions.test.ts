import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ verifyTurnstile: vi.fn(), ensureEmailAccount: vi.fn(), getUser: vi.fn(), provisionUser: vi.fn(), cookies: new Map<string, string>() }))

vi.mock('next/headers', () => ({
    headers: async () => new Headers({ 'x-real-ip': '203.0.113.7', 'user-agent': 'Mozilla/5.0' }),
    cookies: async () => ({ has: (name: string) => mocks.cookies.has(name), get: (name: string) => (mocks.cookies.has(name) ? { name, value: mocks.cookies.get(name) } : undefined) }),
}))
vi.mock('@/lib/auth/turnstile', () => ({ verifyTurnstile: mocks.verifyTurnstile }))
vi.mock('@/cloud/billing', () => ({ drawPriceArm: () => '29' }))
vi.mock('@/app/api/_services/email-sign-up.service', () => ({ ensureEmailAccount: mocks.ensureEmailAccount }))
vi.mock('@/app/api/_services/sign-in-code.service', () => ({ resendSignInCodeIfLive: vi.fn() }))
vi.mock('@/app/api/_services/user-provisioning.service', () => ({ provisionUser: mocks.provisionUser }))
vi.mock('@/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: vi.fn() }))

const { completeSignupAction, prepareEmailSignIn } = await import('./actions')

const account = { id: 'user-1', is_anonymous: false }

beforeEach(() => {
    vi.clearAllMocks()
    mocks.cookies.clear()
    mocks.verifyTurnstile.mockResolvedValue(true)
    mocks.ensureEmailAccount.mockResolvedValue({ ok: true, created: true })
    mocks.getUser.mockResolvedValue({ data: { user: account } })
    mocks.provisionUser.mockResolvedValue({ signedUp: true })
})

describe('completeSignupAction', () => {
    it('stamps the signup of the account behind the request, with the phone step a web signup owes', async () => {
        expect(await completeSignupAction()).toEqual({ ok: true, signedUp: true })

        expect(mocks.provisionUser).toHaveBeenCalledWith(expect.objectContaining({ auth: expect.anything() }), account, { phoneStep: true, priceArm: '29' })
    })

    it('asks no phone of whoever arrived by invite', async () => {
        mocks.cookies.set('pending_invite', '/invite/abc')

        await completeSignupAction()

        expect(mocks.provisionUser).toHaveBeenCalledWith(expect.anything(), account, expect.objectContaining({ phoneStep: false }))
    })

    it('does nothing for a visitor still anonymous, nor for nobody', async () => {
        mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'visitor', is_anonymous: true } } })
        expect(await completeSignupAction()).toEqual({ ok: false })

        mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
        expect(await completeSignupAction()).toEqual({ ok: false })

        expect(mocks.provisionUser).not.toHaveBeenCalled()
    })

    it('says so when the provisioning could not go through', async () => {
        mocks.provisionUser.mockResolvedValueOnce(null)

        expect(await completeSignupAction()).toEqual({ ok: false })
    })
})

describe('prepareEmailSignIn', () => {
    it('opens the account of a normalized address, for the caller behind the edge', async () => {
        expect(await prepareEmailSignIn({ email: '  Ada@Example.com ', captchaToken: 'token' })).toEqual({ ok: true, created: true })

        expect(mocks.verifyTurnstile).toHaveBeenCalledWith('token', '203.0.113.7')
        expect(mocks.ensureEmailAccount).toHaveBeenCalledWith('ada@example.com', '203.0.113.7')
    })

    it('refuses a visitor the robot check turned away, before anything is created', async () => {
        mocks.verifyTurnstile.mockResolvedValue(false)

        expect(await prepareEmailSignIn({ email: 'ada@example.com' })).toEqual({ ok: false, reason: 'captcha_failed', error: 'We could not confirm you are not a robot. Try again.' })
        expect(mocks.ensureEmailAccount).not.toHaveBeenCalled()
    })

    it('refuses what is not an email', async () => {
        expect(await prepareEmailSignIn({ email: 'not-an-email', captchaToken: 'token' })).toMatchObject({ ok: false, reason: 'invalid_email' })
        expect(mocks.verifyTurnstile).not.toHaveBeenCalled()
    })

    it('says a blocked domain is not accepted, in the words the hook uses', async () => {
        mocks.ensureEmailAccount.mockResolvedValue({ ok: false, error: 'blocked_domain' })

        expect(await prepareEmailSignIn({ email: 'someone@blocked.example', captchaToken: 'token' })).toEqual({ ok: false, reason: 'blocked_domain', error: 'This email domain is not accepted. Use another address.' })
    })

    it('passes a held-back caller on', async () => {
        mocks.ensureEmailAccount.mockResolvedValue({ ok: false, error: 'too_many' })

        expect(await prepareEmailSignIn({ email: 'ada@example.com', captchaToken: 'token' })).toMatchObject({ ok: false, reason: 'too_many' })
    })
})
