import { SEO_DESCRIPTION_MAX_LENGTH, SEO_DESCRIPTION_MIN_LENGTH, type TemplateDocument, isSeoDescriptionLength } from '@rerun/contracts'

// What a template needs before it is worth our review. Deliberately the same list the author sees
// as a checklist and the server enforces on submit, so the button never promises something the
// action then refuses.

export type SubmitRequirement = { label: string; met: boolean }

export const META_DESCRIPTION_REQUIREMENT = `A meta description of ${SEO_DESCRIPTION_MIN_LENGTH} to ${SEO_DESCRIPTION_MAX_LENGTH} characters`

// Whether the author's Stripe account can receive payouts. Async on the server, already known to
// the panel, so it is passed in rather than resolved here: the checklist stays pure.
export type SubmitContext = { payoutsReady: boolean }

export function templateSubmitChecklist(doc: TemplateDocument, context: SubmitContext = { payoutsReady: false }): SubmitRequirement[] {
    return [
        { label: 'A title', met: doc.title.trim().length > 0 },
        { label: 'A tagline', met: doc.tagline.trim().length > 0 },
        { label: 'A description', met: doc.longDescription.trim().length > 0 },
        { label: META_DESCRIPTION_REQUIREMENT, met: isSeoDescriptionLength(doc.metaDescription) },
        // No image requirement: the cards draw the board of a captured agent, which the next line
        // already asks for. An author who has one never has to upload a thumbnail to submit.
        { label: 'At least one captured coworker', met: doc.agents.length > 0 },
        { label: 'An install answer for every coworker', met: doc.agents.length > 0 && doc.agents.every(agent => agent.setupRequired !== null) },
        ...(doc.pricingModel === 'free' ? [] : [{ label: 'A Stripe account that can receive payouts', met: context.payoutsReady }]),
    ]
}

export function templateSubmitBlockers(doc: TemplateDocument, context?: SubmitContext): string[] {
    return templateSubmitChecklist(doc, context)
        .filter(requirement => !requirement.met)
        .map(requirement => requirement.label.toLowerCase())
}
