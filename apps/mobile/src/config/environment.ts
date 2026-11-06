import * as Updates from 'expo-updates'

import { PRODUCTION, STAGING } from '@rerun/cloud-mobile/environments'

export type Environment = {
    name: 'production' | 'staging' | 'local'
    apiUrl: string
    supabaseUrl: string
    supabasePublishableKey: string
}

// A store build is bound to its environment by the update channel baked in at build time, never by
// EXPO_PUBLIC_* values: those are inlined by whoever runs `eas update`, so an update published from a
// laptop on the production profile would otherwise point a staging build at production.
export function environmentForChannel(channel: string | null): Environment {
    if (channel === 'production') return PRODUCTION
    if (channel === 'staging') return STAGING

    return {
        name: 'local',
        apiUrl: process.env.EXPO_PUBLIC_API_URL ?? STAGING.apiUrl,
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? STAGING.supabaseUrl,
        supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? STAGING.supabasePublishableKey,
    }
}

export const environment = environmentForChannel(Updates.channel)
