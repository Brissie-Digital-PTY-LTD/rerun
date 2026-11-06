import { isSubscriptionEntitled } from './entitlement'
import { trialArm } from './trial-experiment'

// Which billing dialog a workspace gets, and in which variant. Pure so the dialog and the tests read
// the same answer. `null` is the plan dialog: a paid plan backed by a Stripe subscription.

export type CheckoutVariant = 'start_trial' | 'trial_cardless' | 'trial_card' | 'credit_locked' | 'no_plan' | 'complimentary' | 'paused' | 'template'

// How the right column takes the money:
// - `subscribe`: the plan Checkout, card form included, a trial when the workspace still has one;
// - `card_form`: a trial without a card, which needs one to pay now or at the end of the trial;
// - `card_on_file`: a trial with a card, where paying now is one click.
export type CheckoutPayment = 'subscribe' | 'card_form' | 'card_on_file'

// What starting the plan will ask for: the trial without a card or behind the card form, by the arm
// of the trial test, or the plan billed today once the trial is spent. Copy and routing only:
// startCardlessTrial re-reads the workspace and has the last word.
export type TrialOffer = 'cardless' | 'card_trial' | 'paid'

export function trialOffer(workspace: { id: number; trial_ends_at: string | null; is_sandbox: boolean } | null | undefined): TrialOffer {
    if (workspace?.trial_ends_at || workspace?.is_sandbox) return 'paid'
    return workspace && trialArm(workspace.id) === 'cardless' ? 'cardless' : 'card_trial'
}

export type CheckoutRoute = { variant: CheckoutVariant; payment: CheckoutPayment }

export type CheckoutRouteInput = {
    status: string | null | undefined
    offer: TrialOffer
    paused: boolean
    hasPendingStart: boolean
    trigger: string | null
    // Read off the live subscription, so only known once it has loaded. Entitled workspaces only.
    hasStripePlan: boolean
    hasPaymentMethod: boolean
}

const CREDIT_TRIGGERS = new Set(['budget_exhausted', 'budget_exhausted_trial', 'ai_providers'])

export function checkoutRouteFor(input: CheckoutRouteInput): CheckoutRoute | null {
    if (input.status === 'trialing') {
        const payment = input.hasPaymentMethod ? 'card_on_file' : 'card_form'
        if (input.trigger && CREDIT_TRIGGERS.has(input.trigger)) return { variant: 'credit_locked', payment }
        return { variant: input.hasPaymentMethod ? 'trial_card' : 'trial_cardless', payment }
    }

    if (isSubscriptionEntitled(input.status)) return input.hasStripePlan ? null : { variant: 'complimentary', payment: 'subscribe' }

    if (input.paused) return { variant: 'paused', payment: 'subscribe' }
    // A cardless trial the server turned down lands on the card form like the card arm.
    if (input.offer !== 'paid') return { variant: 'start_trial', payment: 'subscribe' }
    return { variant: input.hasPendingStart ? 'template' : 'no_plan', payment: 'subscribe' }
}
