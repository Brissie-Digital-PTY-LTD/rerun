import { afterEach, describe, expect, it, vi } from 'vitest'

import { drawVariant } from '@rerun/analytics/experiments'
import { drawPriceArm } from './price-experiment'

const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'

afterEach(() => {
    vi.restoreAllMocks()
})

describe('drawPriceArm', () => {
    it('keeps the arm the landing already drew', () => {
        expect(drawPriceArm({ experimentCookie: 'hero7:h|price1:29', consentCookie: undefined, userAgent: BROWSER })).toBe('29')
    })

    it('re-draws a visitor the landing put on an arm retired from the draw', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0)
        expect(drawPriceArm({ experimentCookie: 'price1:49', consentCookie: undefined, userAgent: BROWSER })).toBe('29')
    })

    it('keeps it even for a visitor who has refused the cookie since', () => {
        expect(drawPriceArm({ experimentCookie: 'price1:29', consentCookie: 'v1:denied', userAgent: BROWSER })).toBe('29')
    })

    it('draws a visitor who reached the app without seeing a price', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.99)
        expect(drawPriceArm({ experimentCookie: 'hero7:k', consentCookie: undefined, userAgent: BROWSER })).toBe('29')
        vi.spyOn(Math, 'random').mockReturnValue(0)
        expect(drawPriceArm({ experimentCookie: undefined, consentCookie: undefined, userAgent: BROWSER })).toBe('29')
    })

    it('ignores an arm the test does not have', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0)
        expect(drawPriceArm({ experimentCookie: 'price1:9', consentCookie: undefined, userAgent: BROWSER })).toBe('29')
    })

    it('leaves out of the test a visitor who refused the cookie, and a crawler', () => {
        expect(drawPriceArm({ experimentCookie: undefined, consentCookie: 'v1:denied', userAgent: BROWSER })).toBeNull()
        expect(drawPriceArm({ experimentCookie: undefined, consentCookie: undefined, userAgent: 'Googlebot/2.1' })).toBeNull()
        expect(drawPriceArm({ experimentCookie: undefined, consentCookie: undefined, userAgent: null })).toBeNull()
    })
})

describe('drawVariant', () => {
    it('never draws the $49 arm', () => {
        for (const random of [0, 0.5, 0.999]) {
            vi.spyOn(Math, 'random').mockReturnValue(random)
            expect(drawVariant('price1')).toBe('29')
        }
    })
})
