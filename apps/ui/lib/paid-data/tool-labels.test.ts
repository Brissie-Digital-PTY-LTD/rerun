import { paidDataEntry, toolActivityOf } from '@rerun/contracts'
import { describe, expect, it } from 'vitest'

import { getToolMeta } from '@/lib/tool-meta'
import { paidDataIcon } from './spend'

describe('a paid_data call in the chat', () => {
    it('is labelled after the capability it bought', () => {
        expect(getToolMeta('paid_data', { capability: 'tiktok.user.profile', params: { username: 'khaby.lame' } })).toEqual({ label: 'Reading TikTok', icon: paidDataIcon('tiktok.user.profile') })
    })

    it('reads as what the coworker is doing', () => {
        expect(toolActivityOf('paid_data', { capability: 'tiktok.user.profile', params: { username: 'khaby.lame' } })).toBe(paidDataEntry('tiktok.user.profile').activity)
    })
})
