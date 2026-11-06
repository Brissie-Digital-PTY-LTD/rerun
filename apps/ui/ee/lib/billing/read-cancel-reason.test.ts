import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readCancelReason } from './read-cancel-reason'

const answers = (genuine: [unknown, unknown], category: [unknown, unknown]) => ({
    answers: {
        genuine: { type: 'choice', choice: genuine[0], confidence: genuine[1] },
        category: { type: 'choice', choice: category[0], confidence: category[1] },
    },
})

const respond = (body: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => body })

describe('readCancelReason', () => {
    beforeEach(() => {
        vi.stubEnv('OPENROUTER_API_KEY', 'sk-or-test')
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
    })

    it('files a real reason under its category', async () => {
        vi.stubGlobal('fetch', respond(answers(['real_reason', 0.94], ['too_expensive', 1])))
        expect(await readCancelReason('trop cher')).toEqual({ genuine: true, reason: 'too_expensive' })
    })

    it('turns down keyboard mashing', async () => {
        vi.stubGlobal('fetch', respond(answers(['not_a_reason', 1], ['other', 0.99])))
        expect(await readCancelReason('dcsvcqdsd')).toEqual({ genuine: false, reason: 'other' })
    })

    it('gives the customer the benefit of the doubt', async () => {
        vi.stubGlobal('fetch', respond(answers(['not_a_reason', 0.58], ['unused', 1])))
        expect(await readCancelReason('not for me')).toEqual({ genuine: true, reason: 'unused' })
    })

    it('files under other a category it is unsure of or does not know', async () => {
        vi.stubGlobal('fetch', respond(answers(['real_reason', 0.9], ['low_quality', 0.3])))
        expect(await readCancelReason('I dont like it')).toEqual({ genuine: true, reason: 'other' })

        vi.stubGlobal('fetch', respond(answers(['real_reason', 0.9], ['customer_service', 1])))
        expect(await readCancelReason('support never answered')).toEqual({ genuine: true, reason: 'other' })
    })

    it('gives up on a malformed body, a refusal and a timeout', async () => {
        vi.stubGlobal('fetch', respond({ answers: {} }))
        expect(await readCancelReason('too expensive')).toBeNull()

        vi.stubGlobal('fetch', respond(answers(['real_reason', 1], ['too_expensive', 1]), false))
        expect(await readCancelReason('too expensive')).toBeNull()

        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('TimeoutError')))
        expect(await readCancelReason('too expensive')).toBeNull()
    })

    it('does not call out at all without a key or without a text', async () => {
        const fetcher = respond(answers(['real_reason', 1], ['too_expensive', 1]))
        vi.stubGlobal('fetch', fetcher)
        expect(await readCancelReason('   ')).toBeNull()

        vi.stubEnv('OPENROUTER_API_KEY', '')
        expect(await readCancelReason('too expensive')).toBeNull()
        expect(fetcher).not.toHaveBeenCalled()
    })
})
