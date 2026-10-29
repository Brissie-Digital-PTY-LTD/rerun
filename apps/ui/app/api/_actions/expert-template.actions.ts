'use server'

import { z } from 'zod'
import { requireExpertUserId } from '@/app/api/_auth/expert'
import {
    createAuthorTemplateDraft,
    deleteAuthorTemplate,
    listAuthorTemplates,
    loadAuthorTemplate,
    submitAuthorTemplate,
    updateAuthorTemplate,
    withdrawAuthorTemplate,
} from '@/lib/templates/author'
import { templateAuthorSchema, type ExpertTemplate, type ExpertTemplateDetail } from '@/lib/templates/expert'

import type { ActionResult } from './space.actions'

// An expert authors templates from their sandbox. Ownership is `templates.creator_id`, so every
// action here re-resolves the caller and never trusts an id from the client for anything but the
// row to load. Publication stays admin-only: an author writes drafts and hands them over.
//
// The work itself lives in `lib/templates/author.ts`, which the MCP server calls with the same
// arguments: these are the browser's door to it, not a second implementation.

export async function listMyTemplatesAction(): Promise<ActionResult<{ templates: ExpertTemplate[] }>> {
    try {
        return { ok: true, templates: await listAuthorTemplates(await requireExpertUserId()) }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to load your templates.' }
    }
}

// The editor works on the full document: it mounts the same sections as the admin console, and
// `toTemplateBrief` describes a template from the form rather than from the row.
export async function getMyTemplateAction(id: string): Promise<ActionResult<{ template: ExpertTemplateDetail }>> {
    try {
        return { ok: true, template: await loadAuthorTemplate(await requireExpertUserId(), id) }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to load the template.' }
    }
}

export async function createMyTemplateDraftAction(title: string): Promise<ActionResult<{ id: string }>> {
    try {
        const { id } = await createAuthorTemplateDraft(await requireExpertUserId(), title)
        return { ok: true, id }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to create the template.' }
    }
}

const updateInputSchema = templateAuthorSchema.extend({ id: z.string().uuid() })

export async function updateMyTemplateAction(input: unknown): Promise<ActionResult> {
    try {
        const { id, ...patch } = updateInputSchema.parse(input)
        await updateAuthorTemplate(await requireExpertUserId(), id, patch)
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to save the template.' }
    }
}

export async function submitMyTemplateAction(id: string): Promise<ActionResult> {
    try {
        await submitAuthorTemplate(await requireExpertUserId(), id)
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to submit the template.' }
    }
}

export async function withdrawMyTemplateAction(id: string): Promise<ActionResult> {
    try {
        await withdrawAuthorTemplate(await requireExpertUserId(), id)
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to withdraw the template.' }
    }
}

export async function deleteMyTemplateAction(id: string): Promise<ActionResult> {
    try {
        await deleteAuthorTemplate(await requireExpertUserId(), id)
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete the template.' }
    }
}
