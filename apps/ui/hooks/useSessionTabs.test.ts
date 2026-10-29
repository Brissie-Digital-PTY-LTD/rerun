import { describe, expect, it } from 'vitest'

import { MAX_REMEMBERED_TABS, remember, type SessionTab } from '@/hooks/useSessionTabs'

function tab(n: number): SessionTab {
    return { uid: `uid-${n}`, id: `session-${n}`, title: `Conversation ${n}` }
}

describe('remember', () => {
    it('keeps a list under the ceiling as it is', () => {
        const state = { tabs: [tab(1), tab(2)], activeIndex: 1 }
        expect(remember(state)).toBe(state)
    })

    it('forgets the oldest tabs and follows the active one, appended last', () => {
        const tabs = Array.from({ length: MAX_REMEMBERED_TABS + 3 }, (_, i) => tab(i))
        const kept = remember({ tabs, activeIndex: tabs.length - 1 })
        expect(kept.tabs).toHaveLength(MAX_REMEMBERED_TABS)
        expect(kept.tabs[0]).toBe(tabs[3])
        expect(kept.tabs[kept.activeIndex]).toBe(tabs[tabs.length - 1])
    })

    it('keeps an old active tab ahead of the newest ones', () => {
        const tabs = Array.from({ length: MAX_REMEMBERED_TABS + 3 }, (_, i) => tab(i))
        const kept = remember({ tabs, activeIndex: 1 })
        expect(kept.tabs).toHaveLength(MAX_REMEMBERED_TABS)
        expect(kept.tabs[kept.activeIndex]).toBe(tabs[1])
        expect(kept.tabs.at(-1)).toBe(tabs[tabs.length - 1])
    })
})
