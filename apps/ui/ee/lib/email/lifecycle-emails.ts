// No 'server-only', see lib/email/client.ts: the whole lifecycle module is bundled into a
// Trigger.dev task. One function per sequence, each owning its own subject line: the subject is part
// of the copy, and it has no business being assembled at the call site.
import * as React from 'react'
import {
    AgentIdle,
    AgentRecommendations,
    ArchiveExpiring,
    AutomateAgent,
    CreatorPitch,
    OnboardingResume,
    PaymentFailed,
    RenewalReminder,
    SandboxIdle,
    SubscriptionEnding,
    TeamInvite,
    TrialEnded,
    TrialEnding,
    TrialFinalNotice,
    TrialStarted,
    renderEmail,
    type RecommendedTemplate,
    type TrialEndedReason,
    type TrialSummary,
} from '@rerun/emails'
import { APP_URL, MARKETING_FROM, REPLY_TO, TRANSACTIONAL_FROM, getResendClient, redirectDelivery, type SendEmailResult } from '@/lib/email/client'
import { failureMarker, sendThrottled } from '@/lib/email/throttle'
import { listUnsubscribeHeaders } from '@/lib/email/unsubscribeToken'
import { LIFECYCLE_SEQUENCES, type LifecycleSequenceKey } from '@/ee/lib/lifecycle/sequences'

export type { RecommendedTemplate, TrialEndedReason, TrialSummary }

// `unsubscribeUrl` is null for the mandatory end-of-access notices. They travel without a
// List-Unsubscribe header rather than offering an opt-out the sweeper then ignores.
type Recipient = { to: string; unsubscribeUrl: string | null }

// A billing email reports a fact with consequences and has to reach the inbox, so it keeps the
// transactional domain. Everything else here is a nudge nobody asked for, and it answers for its own
// complaints on the marketing domain.
function senderFor(key: LifecycleSequenceKey): string {
    return LIFECYCLE_SEQUENCES[key].category === 'billing' ? TRANSACTIONAL_FROM : MARKETING_FROM
}

async function deliver(recipient: Recipient, key: LifecycleSequenceKey, subject: string, element: React.ReactElement): Promise<SendEmailResult> {
    const resend = getResendClient()
    if (!resend) {
        console.warn(`[email] RESEND_API_KEY missing, skipping ${key} email`)
        return { ok: true, id: null, skipped: true }
    }

    const { html, text } = await renderEmail(element)
    const delivery = redirectDelivery(recipient.to, subject)

    const { data, error } = await sendThrottled(() =>
        resend.emails.send({
            from: senderFor(key),
            replyTo: REPLY_TO,
            to: delivery.to,
            subject: delivery.subject,
            html,
            text,
            ...(recipient.unsubscribeUrl ? { headers: listUnsubscribeHeaders(recipient.unsubscribeUrl) } : {}),
        }),
    )
    if (error) {
        console.error(`[email] failed to send ${key} email`, error)
        return { ok: false, error: failureMarker(error) }
    }
    return { ok: true, id: data?.id ?? null }
}

export function sendOnboardingResumeEmail(recipient: Recipient, input: { firstName: string | null; resumeUrl: string }): Promise<SendEmailResult> {
    return deliver(recipient, 'onboarding_resume', "Your Rerun setup isn't finished", React.createElement(OnboardingResume, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendAgentRecommendationsEmail(
    recipient: Recipient,
    input: { companyName: string | null; websiteDomain: string | null; templates: RecommendedTemplate[]; browseUrl: string },
): Promise<SendEmailResult> {
    const subject = `${input.templates.length} Rerun coworkers that fit ${input.companyName ?? 'your company'}`
    return deliver(recipient, 'agent_recommendations', subject, React.createElement(AgentRecommendations, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendAgentIdleEmail(recipient: Recipient, input: { agentName: string; createdLabel: string; agentUrl: string; boardUrl?: string }): Promise<SendEmailResult> {
    return deliver(recipient, 'agent_idle', `${input.agentName} is ready, but hasn't run yet`, React.createElement(AgentIdle, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendTeamInviteEmail(recipient: Recipient, input: { workspaceName: string; agentName: string; inviteUrl: string; boardUrl?: string }): Promise<SendEmailResult> {
    return deliver(recipient, 'team_invite', `Bring your team into ${input.workspaceName}`, React.createElement(TeamInvite, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendAutomateAgentEmail(
    recipient: Recipient,
    input: { agentName: string; manualRuns: number; periodLabel: string; lastResult?: string; scheduleUrl: string; boardUrl?: string },
): Promise<SendEmailResult> {
    const subject = `You've run ${input.agentName} by hand ${input.manualRuns} times, schedule the next one`
    return deliver(recipient, 'automate_agent', subject, React.createElement(AutomateAgent, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendTrialStartedEmail(recipient: Recipient, input: { workspaceName: string | null; trialDays: number; trialEndsLabel: string; monthlyPriceLabel: string; includedLabel: string; hasCard: boolean; workspaceUrl: string; boardUrl?: string }): Promise<SendEmailResult> {
    return deliver(recipient, 'trial_started', `Your ${input.trialDays}-day Rerun trial is active`, React.createElement(TrialStarted, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendTrialEndingEmail(recipient: Recipient, input: { workspaceName: string | null; trialEndsLabel: string; daysLeft: number; keptUntilLabel: string; billingUrl: string; boardUrl?: string }): Promise<SendEmailResult> {
    const subject = input.daysLeft === 1 ? 'Your Rerun trial ends tomorrow' : `Your Rerun trial ends in ${input.daysLeft} days`
    return deliver(recipient, 'trial_ending_3d', subject, React.createElement(TrialEnding, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendTrialFinalNoticeEmail(
    recipient: Recipient,
    input: { hasCard: boolean; workspaceName: string | null; trialEndsLabel: string; pausedLabel: string; keptUntilLabel: string; billingUrl: string; boardUrl?: string },
): Promise<SendEmailResult> {
    const subject = input.hasCard ? 'Your Rerun plan starts in 2 hours' : 'Your Rerun trial ends in 2 hours, add a card to keep your coworkers running'
    return deliver(recipient, 'trial_ending_2h', subject, React.createElement(TrialFinalNotice, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendTrialEndedEmail(
    recipient: Recipient,
    input: { reason: TrialEndedReason; workspaceName: string | null; trialEndedLabel: string; pausedLabel: string; keptUntilLabel: string; summary?: TrialSummary; billingUrl: string; boardUrl?: string },
): Promise<SendEmailResult> {
    // The deadline belongs in the subject: this is the one email in the set whose whole point is a
    // date, and an inbox that shows only subject lines has to carry it.
    const subject = input.reason === 'payment_failed' ? 'Your first Rerun payment failed, your workspace is paused in 24 hours' : 'Your Rerun trial has ended, your workspace is paused in 2 hours'
    return deliver(recipient, 'trial_ended', subject, React.createElement(TrialEnded, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendPaymentFailedEmail(
    recipient: Recipient,
    input: { workspaceName: string | null; amountLabel?: string; declinedLabel: string; pausedLabel: string; keptUntilLabel: string; billingUrl: string; boardUrl?: string },
): Promise<SendEmailResult> {
    return deliver(recipient, 'payment_failed', 'Your Rerun payment was declined, your workspace is paused in 24 hours', React.createElement(PaymentFailed, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

// One email for the three rungs of the cancellation ladder, so the rung it was sent for has to
// travel with it: the sender domain and the log line are read from it.
export function sendSubscriptionEndingEmail(
    recipient: Recipient,
    key: LifecycleSequenceKey,
    input: { workspaceName: string | null; endsLabel: string; daysLeft: number; keptUntilLabel: string; billingUrl: string; boardUrl?: string },
): Promise<SendEmailResult> {
    const subject = input.daysLeft <= 1 ? 'Your Rerun subscription ends tomorrow' : `Your Rerun subscription ends in ${input.daysLeft} days`
    return deliver(recipient, key, subject, React.createElement(SubscriptionEnding, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendArchiveExpiringEmail(
    recipient: Recipient,
    input: { workspaceName: string | null; pausedLabel: string; deletionLabel: string; agentCount: number; billingUrl: string; sandbox?: boolean; boardUrl?: string },
): Promise<SendEmailResult> {
    const subject = input.sandbox ? `Your archived Rerun sandbox is deleted on ${input.deletionLabel}` : `Your paused Rerun workspace is deleted on ${input.deletionLabel}`
    return deliver(recipient, 'workspace_archive_expiring', subject, React.createElement(ArchiveExpiring, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendSandboxIdleEmail(recipient: Recipient, input: { lastActiveLabel: string; archiveLabel: string; agentCount: number; sandboxUrl: string; boardUrl?: string }): Promise<SendEmailResult> {
    return deliver(recipient, 'sandbox_idle_warning', `Your Rerun sandbox is archived on ${input.archiveLabel} unless you open it`, React.createElement(SandboxIdle, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendRenewalReminderEmail(
    recipient: Recipient,
    input: { workspaceName: string | null; renewsLabel: string; daysLeft: number; amountLabel?: string; billingUrl: string; boardUrl?: string },
): Promise<SendEmailResult> {
    const subject = input.daysLeft <= 1 ? 'Your Rerun plan renews tomorrow' : `Your Rerun plan renews in ${input.daysLeft} days`
    return deliver(recipient, 'renewal_reminder_7d', subject, React.createElement(RenewalReminder, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}

export function sendCreatorPitchEmail(recipient: Recipient, input: { firstName: string | null; agentName: string | null; creatorUrl: string }): Promise<SendEmailResult> {
    return deliver(recipient, 'creator_pitch', 'Sell the coworkers you build on Rerun', React.createElement(CreatorPitch, { ...input, appUrl: APP_URL, unsubscribeUrl: recipient.unsubscribeUrl ?? undefined }))
}
