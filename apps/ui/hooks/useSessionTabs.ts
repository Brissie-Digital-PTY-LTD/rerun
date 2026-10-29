'use client'

import { nanoid } from 'nanoid'
import { useCallback, useEffect, useRef, useState } from 'react'

export type SessionTab = {
    uid: string
    id: string | null
    title: string
}

export type SessionTabsState = {
    tabs: SessionTab[]
    activeIndex: number
}

// The conversations opened in this panel, most recent last, each one a tab. Past this many the
// oldest are forgotten, and reopened from the coworker's chats list.
export const MAX_REMEMBERED_TABS = 8

// Keeps the newest tabs, and always the active one: a list saved under the old, higher ceiling can
// hold it among the oldest.
export function remember(state: SessionTabsState): SessionTabsState {
    if (state.tabs.length <= MAX_REMEMBERED_TABS) return state
    const active = state.tabs[state.activeIndex]
    const newest = state.tabs.slice(-MAX_REMEMBERED_TABS)
    const tabs = !active || newest.includes(active) ? newest : [active, ...newest.slice(1)]
    return { tabs, activeIndex: Math.max(0, tabs.indexOf(active)) }
}

function getStorageKey(agentId: string) {
    return `session-tabs-${agentId}`
}

function newTab(): SessionTab {
    return { uid: nanoid(), id: null, title: 'New conversation' }
}

function loadFromStorage(agentId: string): SessionTabsState | null {
    try {
        const raw = localStorage.getItem(getStorageKey(agentId))
        if (!raw) return null
        const parsed = JSON.parse(raw) as SessionTabsState
        if (!parsed?.tabs?.length) return null
        // Migration: anciens onglets stockés sans `uid` → en générer un. Le plafond a baissé
        // depuis que les onglets se voient : un état sauvé au-dessus est ramené dessous.
        return remember({
            ...parsed,
            tabs: parsed.tabs.map(t => (t.uid ? t : { ...t, uid: nanoid() })),
        })
    } catch {
        return null
    }
}

function saveToStorage(agentId: string, state: SessionTabsState) {
    try {
        localStorage.setItem(getStorageKey(agentId), JSON.stringify(state))
    } catch {}
}

export function useSessionTabs(agentId: string) {
    const [state, setState] = useState<SessionTabsState>(() => {
        const stored = loadFromStorage(agentId)
        return stored ?? { tabs: [newTab()], activeIndex: 0 }
    })

    const stateRef = useRef(state)
    stateRef.current = state

    useEffect(() => {
        const stored = loadFromStorage(agentId)
        setState(stored ?? { tabs: [newTab()], activeIndex: 0 })
    }, [agentId])

    useEffect(() => {
        saveToStorage(agentId, state)
    }, [agentId, state])

    const activeSessionId = state.tabs[state.activeIndex]?.id ?? null

    // A conversation nobody has spoken in yet is the new one: asking again lands on it.
    const createNew = useCallback(() => {
        setState(prev => {
            const blank = prev.tabs.findIndex(t => t.id === null)
            if (blank !== -1) return { ...prev, activeIndex: blank }
            return remember({ tabs: [...prev.tabs, newTab()], activeIndex: prev.tabs.length })
        })
    }, [])

    const selectTab = useCallback((index: number) => {
        setState(prev => (index === prev.activeIndex ? prev : { ...prev, activeIndex: index }))
    }, [])

    const closeTab = useCallback((index: number) => {
        setState(prev => {
            if (prev.tabs.length <= 1) {
                return { tabs: [newTab()], activeIndex: 0 }
            }
            const newTabs = prev.tabs.filter((_, i) => i !== index)
            let newActive = prev.activeIndex
            if (index === prev.activeIndex) {
                newActive = Math.min(index, newTabs.length - 1)
            } else if (index < prev.activeIndex) {
                newActive = prev.activeIndex - 1
            }
            return { tabs: newTabs, activeIndex: newActive }
        })
    }, [])

    const openTab = useCallback((sessionId: string, title: string) => {
        setState(prev => {
            const existing = prev.tabs.findIndex(t => t.id === sessionId)
            if (existing !== -1) {
                return { ...prev, activeIndex: existing }
            }
            return remember({
                tabs: [...prev.tabs, { uid: nanoid(), id: sessionId, title }],
                activeIndex: prev.tabs.length,
            })
        })
    }, [])

    const updateTabByUid = useCallback((uid: string, sessionId: string, title?: string) => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => (t.uid === uid ? { ...t, id: sessionId, title: title ?? t.title } : t)),
        }))
    }, [])

    const updateTabTitle = useCallback((sessionId: string, title: string) => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t => (t.id === sessionId ? { ...t, title } : t)),
        }))
    }, [])

    return {
        tabs: state.tabs,
        activeIndex: state.activeIndex,
        activeSessionId,
        createNew,
        selectTab,
        closeTab,
        openTab,
        updateTabByUid,
        updateTabTitle,
    }
}
