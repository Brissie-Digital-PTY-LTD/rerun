import type { EmailCategory } from '@/lib/notifications/prefs'

// The behaviour-triggered emails, and nothing else: every one of them reports a fact about this
// account. There is deliberately no feature announcement, no milestone and no generic "we miss you".
export const LIFECYCLE_SEQUENCE_KEYS = [
    'subscription_ending_24h',
    'subscription_ending_3d',
    'subscription_ending_7d',
    'renewal_reminder_7d',
    'trial_ended',
    'trial_ending_2h',
    'trial_ending_3d',
    'workspace_archive_expiring',
    'team_invite',
    'automate_agent',
    'agent_idle',
    'onboarding_resume',
    'agent_recommendations',
    'creator_pitch',
    'trial_started',
    'payment_failed',
    'sandbox_idle_warning',
] as const

export type LifecycleSequenceKey = (typeof LIFECYCLE_SEQUENCE_KEYS)[number]

// What a second send would mean. Mirrored by the three partial unique indexes on
// `lifecycle_emails`: a sequence whose scope changes here has to change there too.
export type LifecycleScope = 'user' | 'workspace' | 'agent'

export type LifecycleSequence = {
    category: EmailCategory
    scope: LifecycleScope
    // Exempt from the one-a-day cap. Only for an email that stops being true tomorrow.
    urgent: boolean
    // Exempt from the category preference too. Only for the end-of-access notices: they announce
    // that a workspace is about to be paused or its archive deleted, which is not something a product
    // opt-out can be read as declining. A mandatory email travels without a List-Unsubscribe
    // header, because offering an opt-out we then ignore is worse than offering none.
    mandatory: boolean
    // How long the triggering fact has to settle before the email is worth sending.
    delayMs: number
    // Past this, sending would be re-engagement rather than a report, and the email is dropped.
    maxAgeMs: number
    // Lower goes first. The activation group (agent_idle, onboarding_resume, agent_recommendations)
    // shares its ranks so that exactly one of the three can ever come out of one pass.
    rank: number
}

const HOUR = 60 * 60_000
const DAY = 24 * HOUR

// The last notice before a trial ends. The teardown pauses an unpaid workspace the same two hours
// after `trial_ended`, so the notice and the grace mirror each other: two hours' warning either side.
export const TRIAL_FINAL_NOTICE_LEAD_MS = 2 * HOUR

// How long before a paused workspace's archive expires its owner hears about it. The purge waits
// this long after the send as well, so a notice that went out late still buys its full week.
export const ARCHIVE_EXPIRING_LEAD_MS = 7 * DAY

// The countdown rungs each react to `deadline - lead`, and their maxAge closes exactly where the
// next one opens: the seven-day reminder stops being sendable the moment the three-day one starts.
export const LIFECYCLE_SEQUENCES: Record<LifecycleSequenceKey, LifecycleSequence> = {
    subscription_ending_24h: { category: 'billing', scope: 'workspace', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: DAY, rank: 0 },
    subscription_ending_3d: { category: 'billing', scope: 'workspace', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: 2 * DAY, rank: 1 },
    subscription_ending_7d: { category: 'billing', scope: 'workspace', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: 4 * DAY, rank: 2 },
    // Asked for from the cancel flow, by one person, for one renewal: user-scoped and kept out of the
    // once-only indexes, since the same person can ask again a month later. Mandatory because nobody
    // opts out of an email they requested a minute ago.
    renewal_reminder_7d: { category: 'billing', scope: 'user', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: 4 * DAY, rank: 2 },
    trial_ended: { category: 'billing', scope: 'workspace', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: 2 * DAY, rank: 3 },
    trial_ending_2h: { category: 'billing', scope: 'workspace', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: TRIAL_FINAL_NOTICE_LEAD_MS, rank: 4 },
    // Closes where the two-hour notice opens, so a trial never gets both in its last two hours.
    trial_ending_3d: { category: 'billing', scope: 'workspace', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: DAY - TRIAL_FINAL_NOTICE_LEAD_MS, rank: 5 },
    // Open from a week before the archive expires up to the expiry itself. Workspace-scoped, but sent
    // once per archive rather than once for life: a workspace paused, restored and paused again is
    // owed a second notice. Kept out of `lifecycle_emails_once_per_workspace_idx` for that reason.
    workspace_archive_expiring: { category: 'billing', scope: 'workspace', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: ARCHIVE_EXPIRING_LEAD_MS, rank: 6 },
    team_invite: { category: 'product', scope: 'workspace', urgent: false, mandatory: false, delayMs: 0, maxAgeMs: 7 * DAY, rank: 7 },
    automate_agent: { category: 'product', scope: 'agent', urgent: false, mandatory: false, delayMs: 0, maxAgeMs: 14 * DAY, rank: 8 },
    agent_idle: { category: 'product', scope: 'agent', urgent: false, mandatory: false, delayMs: DAY, maxAgeMs: 2 * DAY, rank: 9 },
    onboarding_resume: { category: 'product', scope: 'user', urgent: false, mandatory: false, delayMs: DAY, maxAgeMs: 2 * DAY, rank: 10 },
    agent_recommendations: { category: 'product', scope: 'user', urgent: false, mandatory: false, delayMs: DAY, maxAgeMs: 2 * DAY, rank: 11 },
    creator_pitch: { category: 'product', scope: 'user', urgent: false, mandatory: false, delayMs: 3 * DAY, maxAgeMs: 30 * DAY, rank: 12 },
    // Fired inline when the trial starts, never by the sweeper: it is a receipt, and a receipt that
    // arrives fifteen minutes late is a worse receipt.
    trial_started: { category: 'billing', scope: 'workspace', urgent: true, mandatory: false, delayMs: 0, maxAgeMs: DAY, rank: 99 },
    // Fired inline from the Stripe webhook when a renewal is declined: the workspace is paused on the
    // next teardown sweep. In no unique index, since a workspace can miss more than one renewal.
    payment_failed: { category: 'billing', scope: 'workspace', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: DAY, rank: 99 },
    // Sent by the sandbox idle sweep, which counts its two days of grace from this send. Once per
    // idle episode, so in no unique index: a sandbox reopened and left again is owed a new notice.
    sandbox_idle_warning: { category: 'billing', scope: 'workspace', urgent: true, mandatory: true, delayMs: 0, maxAgeMs: DAY, rank: 99 },
}

// How far ahead of the deadline each countdown rung fires. Read by `decide.ts` and by the copy, so
// the number in the subject line and the number in the ladder cannot drift apart.
export const SUBSCRIPTION_ENDING_LEADS: Record<'subscription_ending_7d' | 'subscription_ending_3d' | 'subscription_ending_24h', number> = {
    subscription_ending_7d: 7 * DAY,
    subscription_ending_3d: 3 * DAY,
    subscription_ending_24h: DAY,
}

// How long before a renewal the reminder asked for from the cancel flow goes out: early enough to
// cancel calmly before the card is charged.
export const RENEWAL_REMINDER_LEAD_MS = 7 * DAY

// A day ahead of the end of the trial. The key still says 3d because it is what `lifecycle_emails`
// stores, and the trials sent their reminder under it: renaming it would send it a second time.
export const TRIAL_ENDING_LEAD_MS = DAY

// Switched off on 24/09/2026 for every account, paid ones included. The Foreman onboarding leaves
// nearly every trial with a running agent, and a trial of a few days has room for one reminder, not a
// drip. Their rungs, templates and tests stay so that switching one back on is a one-line change.
// The activation group joined them on 01/10/2026, with every agent notification email.
export const PAUSED_LIFECYCLE_SEQUENCES: ReadonlySet<LifecycleSequenceKey> = new Set(['team_invite', 'automate_agent', 'creator_pitch', 'agent_idle', 'onboarding_resume', 'agent_recommendations'])

// The activation group: at most one of them per person, ever, the day after they arrive.
export const ACTIVATION_SEQUENCES: ReadonlySet<LifecycleSequenceKey> = new Set(['agent_idle', 'onboarding_resume', 'agent_recommendations'])

// Sent inline by their own caller, never by the sweeper: no discovery query and no rung.
const INLINE_LIFECYCLE_SEQUENCES: ReadonlySet<LifecycleSequenceKey> = new Set(['trial_started', 'payment_failed', 'sandbox_idle_warning'])

// The order the sweeper walks.
export const LIFECYCLE_LADDER: LifecycleSequenceKey[] = LIFECYCLE_SEQUENCE_KEYS.filter(key => !INLINE_LIFECYCLE_SEQUENCES.has(key) && !PAUSED_LIFECYCLE_SEQUENCES.has(key)).sort((a, b) => LIFECYCLE_SEQUENCES[a].rank - LIFECYCLE_SEQUENCES[b].rank)

// One non-urgent email a day per recipient, whatever the sequence.
export const LIFECYCLE_DAILY_CAP_MS = DAY

// Nothing older than this is ever a candidate, so the first tick after a deploy cannot mail the
// entire back catalogue of accounts. Read once here rather than at every call site.
export function lifecycleFloor(): Date | null {
    const raw = process.env.LIFECYCLE_EMAILS_START_AT
    if (!raw) return null
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}
