import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import type { ConversationPage } from './conversation-pages'

// How far past the first or the last page, in pages, a drag goes before it bumps into the end of the row.
const EDGE_BUMP = 0.08

const tickOnto = (draft: boolean) => (draft ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.selectionAsync())
const bumpIntoEdge = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)

type ConversationPagerProps = {
    pages: ConversationPage[]
    activeIndex: number
    // Written here, in pages: the header's chips read it to slide with the finger.
    progress: SharedValue<number>
    onSettle: (index: number) => void
    renderPage: (page: ConversationPage, onScreen: boolean) => ReactNode
}

// The coworker's conversations side by side, swiped through as the header's tabs. Only the page on
// screen and its two neighbours are mounted, so a drag already shows the next transcript.
export function ConversationPager({ pages, activeIndex, progress, onSettle, renderPage }: ConversationPagerProps) {
    const scroll = useAnimatedRef<Animated.ScrollView>()
    const reduceMotion = useReducedMotion()
    const [size, setSize] = useState({ width: 0, height: 0 })
    const pageWidth = useSharedValue(0)
    const dragging = useSharedValue(false)
    const restingIndex = useRef(activeIndex)
    const pageCount = useRef(pages.length)
    const lastIndex = pages.length - 1

    // A tab picked in the header slides there; tabs read late from the device shift the index, and the
    // pager jumps to stay on the same conversation.
    useEffect(() => {
        const sameRow = pageCount.current === pages.length
        pageCount.current = pages.length
        if (!size.width) {
            restingIndex.current = activeIndex
            progress.set(activeIndex)
            return
        }
        if (restingIndex.current === activeIndex) return
        restingIndex.current = activeIndex
        const slides = sameRow && !reduceMotion
        if (!slides) progress.set(activeIndex)
        scroll.current?.scrollTo({ x: activeIndex * size.width, animated: slides })
    }, [activeIndex, pages.length, size.width, reduceMotion, progress, scroll])

    const settle = (offset: number) => {
        const index = Math.round(offset / size.width)
        restingIndex.current = index
        if (index !== activeIndex) onSettle(index)
    }

    const onScroll = useAnimatedScrollHandler({
        onScroll: event => {
            if (pageWidth.value > 0) progress.set(event.contentOffset.x / pageWidth.value)
        },
        onBeginDrag: () => {
            dragging.value = true
        },
        onMomentumEnd: event => {
            dragging.value = false
            scheduleOnRN(settle, event.contentOffset.x)
        },
    })

    // Only the finger ticks: a tab picked in the header slides across the row in silence.
    useAnimatedReaction(
        () => Math.round(progress.value),
        (nearest, previous) => {
            if (previous === null || nearest === previous || !dragging.value || nearest < 0 || nearest > lastIndex) return
            scheduleOnRN(tickOnto, nearest === lastIndex)
        },
        [lastIndex]
    )

    useAnimatedReaction(
        () => progress.value < -EDGE_BUMP || progress.value > lastIndex + EDGE_BUMP,
        (pastEdge, wasPastEdge) => {
            if (pastEdge && wasPastEdge === false && dragging.value) scheduleOnRN(bumpIntoEdge)
        },
        [lastIndex]
    )

    return (
        <View
            style={{ flex: 1 }}
            onLayout={({ nativeEvent: { layout } }) => {
                pageWidth.value = layout.width
                setSize(known => (known.width === layout.width && known.height === layout.height ? known : { width: layout.width, height: layout.height }))
            }}
        >
            {size.width > 0 && (
                <Animated.ScrollView
                    ref={scroll}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    scrollsToTop={false}
                    scrollEventThrottle={16}
                    contentOffset={{ x: activeIndex * size.width, y: 0 }}
                    onScroll={onScroll}
                >
                    {pages.map((page, index) => {
                        const onScreen = index === activeIndex
                        return (
                            <View key={page.key} accessibilityElementsHidden={!onScreen} importantForAccessibility={onScreen ? 'auto' : 'no-hide-descendants'} style={{ width: size.width, height: size.height, overflow: 'hidden' }}>
                                {Math.abs(index - activeIndex) <= 1 && renderPage(page, onScreen)}
                            </View>
                        )
                    })}
                </Animated.ScrollView>
            )}
        </View>
    )
}
