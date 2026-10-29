'use server'

import { requireWorkspaceContext } from '@/app/api/_auth/ownership'
import { requestCompanyBrainSeed } from '@/lib/brain/request-seed'
import { companySiteUrl } from '@/lib/company/firecrawl'
import { readAnswers, writeAnswers } from '@/lib/foreman/profile'

export type SeedCompanyBrainResult = { ok: true } | { ok: false; error: string }

const DOUBLE_CLICK_WINDOW_MS = 60_000

// Without a website, the one already given at onboarding is explored again.
export async function seedCompanyBrainAction(website?: string): Promise<SeedCompanyBrainResult> {
    const ctx = await requireWorkspaceContext()
    const answers = await readAnswers(ctx)

    const typed = website?.trim()
    const url = companySiteUrl(typed || answers.company_url || '')
    if (!url) return { ok: false, error: typed ? 'That does not look like a website address' : 'Add your website first' }

    if (typed && url !== answers.company_url) await writeAnswers(ctx, { ...answers, company_url: url }, false)

    // Each press is a new run, except a second one inside the same minute.
    const window = Math.floor(Date.now() / DOUBLE_CLICK_WINDOW_MS)
    // A fresh exploration too: the one the onboarding ran is what is being asked to be read again.
    const requested = await requestCompanyBrainSeed(ctx.workspace.id, `brain-seed-${ctx.workspace.id}-${window}`, `company-explore-reseed-${ctx.workspace.id}-${window}`)
    return requested ? { ok: true } : { ok: false, error: 'Could not start reading your website, please try again' }
}
