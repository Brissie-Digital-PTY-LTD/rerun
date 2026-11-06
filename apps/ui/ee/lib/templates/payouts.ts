import type { BadgeTone } from '@rerun/ui/primitives'
import type { PayoutState } from '@/ee/services/connect.service'

// The five payout states as the panel shows them, mapped once here the way template statuses are.
// A badge is never styled inline.

const PAYOUT_TONES: Record<PayoutState, BadgeTone> = {
    not_started: 'neutral',
    incomplete: 'orange',
    pending_verification: 'cyan',
    restricted: 'red',
    ready: 'green',
}

const PAYOUT_LABELS: Record<PayoutState, string> = {
    not_started: 'Not set up',
    incomplete: 'Action needed',
    pending_verification: 'In review',
    restricted: 'Restricted',
    ready: 'Ready',
}

export function payoutStateTone(state: PayoutState): BadgeTone {
    return PAYOUT_TONES[state]
}

export function payoutStateLabel(state: PayoutState): string {
    return PAYOUT_LABELS[state]
}

// Stripe names its requirements in dotted paths ("individual.verification.document"), which are
// unreadable in a list. Only the common ones are spelled out; the rest fall back to a humanised
// form of the path rather than being hidden, because a requirement nobody can read is still a
// requirement blocking their payouts.
const REQUIREMENT_LABELS: Record<string, string> = {
    'business_profile.url': 'A business website',
    'business_profile.mcc': 'Your line of business',
    'external_account': 'A bank account',
    'individual.verification.document': 'An identity document',
    'individual.verification.additional_document': 'A proof of address',
    'individual.id_number': 'Your national ID number',
    'individual.address.line1': 'Your address',
    'individual.dob.day': 'Your date of birth',
    'tos_acceptance.date': 'Accepting the Stripe terms',
}

export function requirementLabel(requirement: string): string {
    const known = REQUIREMENT_LABELS[requirement]
    if (known) return known

    const readable = requirement.split('.').pop()?.replace(/_/g, ' ') ?? requirement
    return readable.charAt(0).toUpperCase() + readable.slice(1)
}

const SALE_TONES: Record<string, BadgeTone> = { one_time: 'neutral', recurring: 'cyan', refund: 'orange' }
const SALE_LABELS: Record<string, string> = { one_time: 'One-time', recurring: 'Monthly', refund: 'Refund' }

export function saleKindTone(kind: string): BadgeTone {
    return SALE_TONES[kind] ?? 'neutral'
}

export function saleKindLabel(kind: string): string {
    return SALE_LABELS[kind] ?? kind
}
