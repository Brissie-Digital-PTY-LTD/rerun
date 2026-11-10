import type { Database } from '@/app/api/database.types'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createServiceRoleClient } from './serviceRole'

// Local development: one shared account, signed in on the first page load, so the app never asks for
// a login. Only active when LOCAL_NO_AUTH=1 — never set it on a shared deployment: anyone who
// reaches the app is that account.
const DEFAULT_EMAIL = 'local@rerun.local'
const DEFAULT_PASSWORD = 'rerun-local-dev'

export function isLocalNoAuthEnabled(): boolean {
    return process.env.LOCAL_NO_AUTH === '1'
}

function localCredentials(): { email: string; password: string } {
    return {
        email: process.env.LOCAL_NO_AUTH_EMAIL ?? DEFAULT_EMAIL,
        password: process.env.LOCAL_NO_AUTH_PASSWORD ?? DEFAULT_PASSWORD,
    }
}

// Signs the cookie client in as the shared local account, creating it on first run (or repairing a
// changed password). The service role is what finds or creates it; the password never reaches the
// browser. Answers the signed-in user, null when the sign-in failed and the normal flow keeps going.
export async function ensureLocalAutoSignIn(client: SupabaseClient<Database>): Promise<User | null> {
    const { email, password } = localCredentials()
    const first = await client.auth.signInWithPassword({ email, password })
    if (!first.error && first.data.user) return first.data.user

    const admin = createServiceRoleClient()
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = listed?.users.find(user => user.email?.toLowerCase() === email.toLowerCase())
    if (existing) {
        const { error } = await admin.auth.admin.updateUserById(existing.id, { password })
        if (error) {
            console.error('Local auto sign-in failed', error.message)
            return null
        }
    } else {
        const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
        if (error) {
            console.error('Local auto sign-in failed', error.message)
            return null
        }
    }

    const retry = await client.auth.signInWithPassword({ email, password })
    if (retry.error || !retry.data.user) {
        console.error('Local auto sign-in failed', retry.error?.message ?? 'no session')
        return null
    }
    return retry.data.user
}
