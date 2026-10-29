'use client'

import { useScrollFade } from '@rerun/ui/primitives'
import { useEffect, useMemo, useState } from 'react'

import type { SessionTab } from '@/hooks/useSessionTabs'
import { ATTENTION_STATUSES } from '@/lib/board/attention'
import { PlusIcon, XIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useBoardStore } from '@/stores/board.store'

type TabState = 'live' | 'needs' | 'quiet'

type OpenChatsTabsProps = {
    tabs: SessionTab[]
    activeIndex: number
    onSelect: (index: number) => void
    onClose: (index: number) => void
    onCreate: () => void
}

/**
 * The coworker's open conversations, left-aligned under the pills: the active one on a muted fill,
 * the others as plain text. Too many to fit, the row scrolls and only the edge still hiding a tab
 * fades.
 */
export function OpenChatsTabs({ tabs, activeIndex, onSelect, onClose, onCreate }: OpenChatsTabsProps) {
    const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
    const fadeMask = useScrollFade(scroller, { axis: 'x' })
    const sessions = useBoardStore(s => s.sessions)
    const statusById = useMemo(() => new Map(sessions.map(session => [session.id, session.status])), [sessions])

    useEffect(() => {
        scroller?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }, [scroller, activeIndex])

    const stateOf = (tab: SessionTab): TabState => {
        const status = tab.id ? statusById.get(tab.id) : undefined
        if (status === 'working') return 'live'
        if (status && ATTENTION_STATUSES.has(status)) return 'needs'
        return 'quiet'
    }

    return (
        <div className="flex w-full items-center gap-1 px-3">
            <div ref={setScroller} className="min-w-0 overflow-x-auto [scrollbar-width:none]" style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}>
                <div className="flex w-max items-center gap-1">
                    {tabs.map((tab, index) => {
                        const active = index === activeIndex
                        return (
                            <div
                                key={tab.uid}
                                data-active={active}
                                className={cn(
                                    'group flex h-7 shrink-0 items-center gap-1 rounded-md pl-2.5 pr-1 text-xs transition-colors',
                                    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                )}
                            >
                                <button type="button" onClick={() => onSelect(index)} className="flex min-w-0 items-center gap-1.5">
                                    <StateDot state={stateOf(tab)} />
                                    <span className="max-w-[160px] truncate">{tab.title}</span>
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Close ${tab.title}`}
                                    onClick={() => onClose(index)}
                                    className={cn('flex size-5 shrink-0 items-center justify-center rounded hover:bg-background/60', !active && 'opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100')}
                                >
                                    <XIcon className="size-3" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
            <button
                type="button"
                aria-label="New conversation"
                onClick={onCreate}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
                <PlusIcon className="size-3.5" />
            </button>
        </div>
    )
}

function StateDot({ state }: { state: TabState }) {
    if (state === 'quiet') return null
    return (
        <span className="relative flex size-1.5 shrink-0">
            {state === 'live' && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />}
            <span className={cn('relative size-1.5 rounded-full', state === 'live' ? 'bg-emerald-400' : 'bg-amber-400')} />
        </span>
    )
}
