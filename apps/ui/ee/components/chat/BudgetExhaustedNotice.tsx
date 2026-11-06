'use client'

import { toast } from 'sonner'

import { setRerunCreditPausedAction } from '@/ee/actions/billing.actions'
import { NoticeActions, type NoticeAction } from '@/components/chat/NoticeActions'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { ProviderIcon } from '@/lib/engine/provider-icons'
import { useBillingStore } from '@/stores/billing.store'
import { BorderBeam } from '@rerun/ui'
import { CoinsIcon, CreditCardIcon, PauseIcon, Play, ZapOffIcon } from '@/lib/icons'
import { BASE_PLAN_CREDITS, TRIAL_CREDITS, creditsLabel } from '@/ee/lib/billing/plans'

type SubscriptionProvider = 'claude' | 'codex'

// `onConnectProvider` opens the workspace's AI providers on the sign-in of the plan that was picked.
// A chat with no board behind it has nowhere to send the user, so it leaves the two buttons out
// rather than showing dead ones, and the notice is down to its one paid way out.
//
// `preTrial` is the foreman's case: the credit that just ran out is the signup allowance, a top-up
// that does not come back, on a workspace with no plan. Telling that user about a monthly reset and
// selling them credits would be wrong twice. Passed in rather than read from the session, so the
// notice keeps rendering in the UI kit, outside every provider.
//
// `trialing` is the same signup allowance running out during the trial: it does not reset either,
// and credit packs are not sold on a trial. What opens more is the plan itself, paid today.
//
// `paused` is a member having turned the credit off: the hub answers the same 402, but nothing ran
// out, and the one way out is turning it back on.
// `ownConnection` is a Claude or ChatGPT plan already connected to the Box while this conversation
// still ran on Rerun: inviting to connect it again would only sign in once more and change nothing.
// Running the conversation on it is the way out that works.
//
// `noCredit` is a workspace that never had any Rerun credit, such as a workspace added before its
// plan: nothing was used up, so the notice does not say it was.
export type BudgetNoticeOwnConnection = { label: string; provider: string; onUse: () => void }

export function BudgetExhaustedNotice({ onConnectProvider, ownConnection, preTrial, trialing, paused, noCredit }: { onConnectProvider?: (provider: SubscriptionProvider) => void; ownConnection?: BudgetNoticeOwnConnection; preTrial?: boolean; trialing?: boolean; paused?: boolean; noCredit?: boolean }) {
    const openBilling = useBillingStore(s => s.openBilling)

    if (paused) {
        const resume = async () => {
            const result = await setRerunCreditPausedAction(false)
            if (!result.ok) toast.error(result.error)
        }
        return (
            <div className="relative mb-2 space-y-2.5 overflow-hidden rounded-lg px-4 pt-3 pb-4">
                <BorderBeam animated pattern="arcs" tone="orange" glow width={1} duration={7} />
                <div className="flex items-center gap-2.5 text-sm">
                    <Icon size="sm" tone="orange" icon={PauseIcon} />
                    <span className="font-medium">Rerun credits paused</span>
                </div>
                <p className="text-sm">Your coworkers can&apos;t use Rerun models or paid data until someone resumes them.</p>
                <NoticeActions actions={[{ key: 'resume', leading: <Icon icon={Play} size="sm" />, title: 'Resume Rerun credits', description: 'Spending starts again right away.', cta: 'Resume', onClick: resume }]} />
            </div>
        )
    }

    if (preTrial) {
        return (
            <div className="relative mb-2 space-y-2.5 overflow-hidden rounded-lg px-4 pt-3 pb-4">
                <BorderBeam animated pattern="arcs" tone="red" glow width={1} duration={7} />
                <div className="flex items-center gap-2.5 text-sm">
                    <Icon size="sm" tone="red" icon={ZapOffIcon} className="bg-red-500/10 text-foreground" />
                    <span className="font-medium">Rerun credits</span>
                </div>
                <p className="text-sm">You&apos;ve used up the {creditsLabel(TRIAL_CREDITS)} that come with a new account. Subscribing is what opens the rest.</p>
                <NoticeActions actions={[{ key: 'trial', leading: <Icon icon={CreditCardIcon} size="sm" />, title: 'Subscribe now', description: 'Your coworkers keep working, cancel any time.', cta: 'Subscribe', onClick: () => openBilling(undefined, 'budget_exhausted_pre_trial') }]} />
            </div>
        )
    }

    // A workspace with no credit at all has no month that will refill it: what opens credit is the plan.
    const paidWayOut: NoticeAction = trialing || noCredit
        ? {
              key: 'plan',
              leading: <Icon icon={CreditCardIcon} size="sm" />,
              title: 'Subscribe now',
              cta: 'Subscribe',
              description: trialing ? `Ends your trial today. ${creditsLabel(BASE_PLAN_CREDITS)} included every month.` : `${creditsLabel(BASE_PLAN_CREDITS)} included every month.`,
              onClick: () => openBilling(undefined, trialing ? 'budget_exhausted_trial' : 'budget_exhausted'),
          }
        : {
              key: 'credits',
              leading: <Icon icon={CoinsIcon} size="sm" />,
              title: 'Top up your Rerun credits',
              cta: 'Top up',
              description: 'Or wait, it resets next month.',
              onClick: () => openBilling('credit_pack', 'budget_exhausted'),
          }
    const usedUp = noCredit ? 'This workspace has no Rerun credits yet.' : trialing ? `You've used up the ${creditsLabel(TRIAL_CREDITS)} of your free trial.` : "You've used up your Rerun credits for this period."

    return (
        <div className="relative mb-2 space-y-2.5 overflow-hidden rounded-lg px-4 pt-3 pb-4">
            <BorderBeam animated pattern="arcs" tone="red" glow width={1} duration={7} />
            <div className="flex items-center gap-2.5 text-sm">
                <Icon size="sm" tone="red" icon={ZapOffIcon} className="bg-red-500/10 text-foreground" />
                <span className="font-medium">Rerun credits</span>
            </div>
            {ownConnection ? (
                <>
                    <p className="text-sm">
                        {usedUp} This conversation ran on Rerun, and your {ownConnection.label} plan is connected.
                    </p>
                    <Button size="sm" className="w-full" onClick={ownConnection.onUse}>
                        <ProviderIcon provider={ownConnection.provider} className="size-3.5" />
                        <span className="truncate">Run on {ownConnection.label}</span>
                    </Button>
                    <div className="flex items-center gap-2 text-xs uppercase">
                        <span className="flex-1 border-t" />
                        <span className="text-muted-foreground">Or</span>
                        <span className="flex-1 border-t" />
                    </div>
                    <NoticeActions actions={[{ ...paidWayOut, variant: 'outline' }]} />
                </>
            ) : onConnectProvider ? (
                <>
                    <p className="text-sm">{usedUp} Already paying for Claude or ChatGPT? Run your coworkers on that plan, at no extra cost here.</p>
                    <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" onClick={() => onConnectProvider('claude')}>
                            <ProviderIcon provider="claude" className="size-3.5" />
                            Connect Claude
                        </Button>
                        <Button size="sm" onClick={() => onConnectProvider('codex')}>
                            <ProviderIcon provider="openai" className="size-3.5" />
                            Connect ChatGPT
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs uppercase">
                        <span className="flex-1 border-t" />
                        <span className="text-muted-foreground">Or</span>
                        <span className="flex-1 border-t" />
                    </div>
                    <NoticeActions actions={[{ ...paidWayOut, variant: 'outline' }]} />
                </>
            ) : (
                <>
                    <p className="text-sm">{trialing || noCredit ? `${usedUp} Subscribe to keep your coworkers working.` : `${usedUp} It resets next month.`}</p>
                    <NoticeActions actions={[paidWayOut]} />
                </>
            )}
        </div>
    )
}
