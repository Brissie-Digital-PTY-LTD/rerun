import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeSupabase } from '@/test/supabase-fake'

vi.mock('server-only', () => ({}))

const admin = { createUser: vi.fn() }
let supabase = fakeSupabase()
vi.mock('@/supabase/serviceRole', () => ({ createServiceRoleClient: () => Object.assign(supabase.client, { auth: { admin } }) }))

const EMAIL = 'ada@example.com'
const IP = '203.0.113.7'

const stored = (state: { exists?: boolean; blocked?: boolean; claimed?: boolean; existsError?: boolean }) => {
    supabase = fakeSupabase(table => {
        if (table === 'rpc:check_email_exists') return state.existsError ? { error: { message: 'down' } } : { data: state.exists ?? false }
        if (table === 'rpc:email_domain_is_blocked') return { data: state.blocked ?? false }
        if (table === 'rpc:claim_email_sign_up') return { data: state.claimed ?? true }
        return undefined
    })
}

const rpcArgs = (fn: string) => supabase.calls.filter(call => call.method === 'rpc' && call.args[0] === fn).map(call => call.args[1])

const { ensureEmailAccount, MAX_SIGN_UPS_PER_IP } = await import('./email-sign-up.service')

beforeEach(() => {
    admin.createUser.mockReset()
    admin.createUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('ensureEmailAccount', () => {
    it('creates an unconfirmed account with no password for an address never seen', async () => {
        stored({})

        expect(await ensureEmailAccount(EMAIL, IP)).toEqual({ ok: true, created: true })

        expect(admin.createUser).toHaveBeenCalledWith({ email: EMAIL })
        expect(rpcArgs('email_domain_is_blocked')).toEqual([{ p_email: EMAIL }])
        expect(rpcArgs('claim_email_sign_up')).toEqual([{ p_ip: IP, p_ip_max: MAX_SIGN_UPS_PER_IP, p_window_seconds: 3600 }])
    })

    it('leaves an existing account alone, and counts nothing against the caller', async () => {
        stored({ exists: true })

        expect(await ensureEmailAccount(EMAIL, IP)).toEqual({ ok: true, created: false })

        expect(admin.createUser).not.toHaveBeenCalled()
        expect(rpcArgs('claim_email_sign_up')).toEqual([])
    })

    it('refuses an address on a blocked domain before it counts or creates anything', async () => {
        stored({ blocked: true })

        expect(await ensureEmailAccount('someone@edu.catchall.example', IP)).toEqual({ ok: false, error: 'blocked_domain' })

        expect(rpcArgs('email_domain_is_blocked')).toEqual([{ p_email: 'someone@edu.catchall.example' }])
        expect(rpcArgs('claim_email_sign_up')).toEqual([])
        expect(admin.createUser).not.toHaveBeenCalled()
    })

    it('holds back a caller who has opened too many accounts', async () => {
        stored({ claimed: false })

        expect(await ensureEmailAccount(EMAIL, IP)).toEqual({ ok: false, error: 'too_many' })
        expect(admin.createUser).not.toHaveBeenCalled()
    })

    it('counts an IPv6 caller by its /64', async () => {
        stored({})

        await ensureEmailAccount(EMAIL, '2001:db8:1:2:3:4:5:6')

        expect(rpcArgs('claim_email_sign_up')).toEqual([expect.objectContaining({ p_ip: '2001:db8:1:2::/64' })])
    })

    it('takes an account created a moment earlier by another tab as there', async () => {
        stored({})
        admin.createUser.mockResolvedValue({ data: { user: null }, error: { code: 'email_exists', message: 'exists' } })

        expect(await ensureEmailAccount(EMAIL, IP)).toEqual({ ok: true, created: false })
    })

    it('says unavailable when the account cannot be created', async () => {
        stored({})
        admin.createUser.mockResolvedValue({ data: { user: null }, error: { code: 'unexpected_failure', message: 'boom' } })
        vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(await ensureEmailAccount(EMAIL, IP)).toEqual({ ok: false, error: 'unavailable' })
    })

    it('creates nothing when it cannot tell whether the address has an account', async () => {
        stored({ existsError: true })

        expect(await ensureEmailAccount(EMAIL, IP)).toEqual({ ok: false, error: 'unavailable' })
        expect(admin.createUser).not.toHaveBeenCalled()
    })
})
