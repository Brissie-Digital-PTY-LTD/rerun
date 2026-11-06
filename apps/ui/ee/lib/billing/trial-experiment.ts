// The A/B test on the trial: half the new workspaces start it without a card, straight from the
// offer card, the other half through the card form. The arm is a hash of the workspace id rather
// than a stored draw, so the server that enforces it and the browser that words the offer agree
// without a column, and the anonymous visitor keeps the arm once they sign up, the workspace being
// the same row. The key carries its version: changing it is what redraws everyone. `trial_card_v1`
// ran from 2026-09-24 to 2026-10-08.
export const TRIAL_CARD_EXPERIMENT = 'trial_card_v2'

// When the first workspace was drawn into an arm. A workspace created before it was never offered
// a choice, so counting it would credit one arm with the card-only flow. Moves with the key.
export const TRIAL_CARD_EXPERIMENT_STARTED_AT = Date.parse('2026-10-22T14:00:00Z')

// 0 or 1 ends the test on one arm without touching any call site.
export const TRIAL_CARD_SHARE = 1

// The PostHog property the arm is read under, on events and on the person.
export const TRIAL_CARD_PROPERTY = 'ab_trial_card'

export type TrialArm = 'card' | 'cardless'

// FNV-1a, 32 bits, then murmur3's finalizer: FNV alone barely moves the high bits on the last
// characters, which is where consecutive ids differ, and split them 47/53 instead of half and half.
function unitHash(input: string): number {
    let hash = 0x811c9dc5
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    hash ^= hash >>> 16
    hash = Math.imul(hash, 0x85ebca6b)
    hash ^= hash >>> 13
    hash = Math.imul(hash, 0xc2b2ae35)
    hash ^= hash >>> 16
    return (hash >>> 0) / 0x1_0000_0000
}

export function trialArm(workspaceId: number, share = TRIAL_CARD_SHARE): TrialArm {
    return unitHash(`${TRIAL_CARD_EXPERIMENT}:${workspaceId}`) < share ? 'card' : 'cardless'
}
