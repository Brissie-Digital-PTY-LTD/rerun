import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

export function createPublicClient() {
    return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { persistSession: false },
    })
}

export function createServiceRoleClient() {
    return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
        auth: { persistSession: false },
    })
}
