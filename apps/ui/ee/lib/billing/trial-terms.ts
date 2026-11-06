import { PLAN_CURRENCY, basePriceCents, cardlessTrialLine, formatAmount, trialChargeLine, trialEndDate, type PriceArm } from '@rerun/contracts'

import type { TrialOffer } from './checkout-variant'
import { shortDate } from './dates'

// The trial offer in its one sentence, for a trial that would start now: either arm of the trial
// test rolls into the monthly base plan at the workspace's price arm.
export function trialOfferLine(priceArm: PriceArm, offer: TrialOffer, now: Date = new Date()): string {
    const line = offer === 'cardless' ? cardlessTrialLine : trialChargeLine
    return line(formatAmount(basePriceCents(priceArm), PLAN_CURRENCY), shortDate(trialEndDate(now)))
}
