// The A/B test on the price of the base plan: $29 against $49 a month. The arm cannot be a hash of
// the workspace id: the landing quotes the price before there is a workspace, so the draw happens
// there and travels in the experiment cookie. It is frozen on `workspaces.price_arm` when the
// workspace is created, and the column is the truth from then on: the cookie follows neither a
// second device nor an invited teammate.
import { parseConsentCookie, type PriceArm } from '@rerun/contracts'
import { drawVariant, isCrawler, isRetiredVariant, parseExperimentCookie } from '@rerun/analytics/experiments'

export const PRICE_EXPERIMENT_KEY = 'price1'

// The PostHog property the arm is read under, on events and on the person. Same name as the one
// the landing registers off the cookie, so a funnel reads one property from the first visit on.
export const PRICE_PROPERTY = `ab_${PRICE_EXPERIMENT_KEY}`

// The arm of a workspace about to be created. A visitor the landing already drew keeps that arm; one
// who reached the app without seeing a price is drawn here. null leaves the workspace out of the test
// at the list price: a refusal of the cookie forbids writing the arm back for the landing to agree
// with, and a crawler would be redrawn on every visit.
export function drawPriceArm(request: { experimentCookie: string | undefined; consentCookie: string | undefined; userAgent: string | null }): PriceArm | null {
    const enrolled = parseExperimentCookie(request.experimentCookie)[PRICE_EXPERIMENT_KEY]
    if (enrolled && !isRetiredVariant(PRICE_EXPERIMENT_KEY, enrolled)) return enrolled
    if (parseConsentCookie(request.consentCookie) === 'denied' || isCrawler(request.userAgent)) return null
    return drawVariant(PRICE_EXPERIMENT_KEY)
}
