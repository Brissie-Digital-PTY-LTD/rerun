'use server'

import { z } from 'zod'
import { requireWorkspaceId } from '@/app/api/_auth/ownership'
import {
    confirmTemplateCheckoutSession,
    createTemplateCheckoutSession,
    NO_PLAN_ERROR,
    type TemplateCheckoutOutcome,
} from '@/ee/services/template-checkout.service'
import { templateAccessByWorkspace, type PurchaseAccess } from '@/lib/templates/entitlement'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectMaybeSingle } from '@/supabase/supabase-helpers'

import type { ActionResult } from '@/app/api/_actions/space.actions'

// A purchase is made by a workspace: any member may start one, and the button says whose card it
// lands on. `purchased_by` keeps the record of who clicked.

const slugSchema = z.string().trim().min(1).max(200)

export type StartCheckoutResult = ActionResult<{ outcome: TemplateCheckoutOutcome }> | { ok: false; error: string; needsPlan: true }

export async function startTemplateCheckoutAction(slug: string): Promise<StartCheckoutResult> {
    try {
        const outcome = await createTemplateCheckoutSession(slugSchema.parse(slug))
        return { ok: true, outcome }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start the checkout.'
        if (message === NO_PLAN_ERROR) return { ok: false, error: 'An active Rerun plan is required to buy a template.', needsPlan: true }
        return { ok: false, error: message }
    }
}

export async function confirmTemplatePurchaseAction(sessionId: string): Promise<ActionResult<{ entitled: boolean }>> {
    try {
        const { entitled } = await confirmTemplateCheckoutSession(z.string().trim().min(1).max(200).parse(sessionId))
        return { ok: true, entitled }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to confirm the purchase.' }
    }
}

// What the purchase dialog polls while it waits for the webhook, and what the library re-reads
// after one lands.
export async function getTemplateAccessAction(slug: string): Promise<ActionResult<{ access: PurchaseAccess }>> {
    try {
        const workspaceId = await requireWorkspaceId()
        const supabase = createServiceRoleClient()

        const { data: template } = await selectMaybeSingle(supabase, 'templates', ['id', 'pricing_model'] as const, { slug: slugSchema.parse(slug) })
        if (!template) return { ok: false, error: 'Template not found.' }
        if (template.pricing_model === 'free') return { ok: true, access: 'active' }

        const access = await templateAccessByWorkspace(supabase, workspaceId)
        return { ok: true, access: access.get(template.id) ?? 'none' }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to read your purchases.' }
    }
}
