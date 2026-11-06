import type { Metadata } from 'next'
import Link from 'next/link'
import { EmailPreferencesForm } from '@/components/settings/EmailPreferencesForm'
import { SignInPillButton } from '@/components/layout/SignInPill'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribeToken'
import { normalizeEmailPrefs } from '@/lib/notifications/prefs'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectSingle } from '@/supabase/supabase-helpers'

export const metadata: Metadata = {
    title: 'Email preferences',
}

export const dynamic = 'force-dynamic'

async function loadPrefs(token: string) {
    const target = verifyUnsubscribeToken(token)
    if (!target) return null
    const supabase = createServiceRoleClient()
    const { data } = await selectSingle(supabase, 'users', ['email_notification_prefs'] as const, { id: target.userId })
    return { prefs: normalizeEmailPrefs(data?.email_notification_prefs), scope: target.scope }
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams
    const loaded = token ? await loadPrefs(token) : null

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-4 py-16">
            <div className="absolute top-4 right-4 z-40">
                <SignInPillButton />
            </div>

            <header className="flex flex-col gap-1 px-3">
                <h1 className="text-xl font-semibold text-foreground">Email preferences</h1>
                <p className="text-sm text-muted-foreground">
                    {loaded?.scope === 'runs' ? 'Choose whether your coworkers can email you. No account login needed.' : 'Update which emails Rerun sends you. No account login needed.'}
                </p>
            </header>

            {loaded && token ? (
                <EmailPreferencesForm initialPrefs={loaded.prefs} token={token} />
            ) : (
                <div className="rounded-lg border border-border bg-card/50 p-6 text-sm text-muted-foreground">
                    <p>This unsubscribe link is invalid or has expired.</p>
                    <Link href="/" className="mt-2 inline-block text-foreground underline">
                        Log in to manage your preferences
                    </Link>
                </div>
            )}
        </main>
    )
}
