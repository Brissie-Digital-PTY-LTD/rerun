'use client'

import { VoiceWaveform } from '@/components/chat/VoiceWaveform'
import { Spinner } from '@/components/ui/spinner'
import { rawUrlResolver, type RawUrlFor } from '@/lib/files/raw-url'
import { PauseIcon, Play } from '@/lib/icons'
import { formatVoiceDuration } from '@/lib/voice/duration'
import { PEAK_COUNT } from '@/lib/voice/peaks'
import { BorderBeam } from '@rerun/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

type VoiceMessageBubbleProps = {
    agentId?: string
    /** Where the bytes come from when they are not a Box's: the foreman keeps its own. */
    rawUrlFor?: RawUrlFor
    /** Path of the recording next to the conversation's other files. */
    src: string
    durationMs: number
    peaks: number[]
    /** Carried by the message marker and read by the agent, not shown in the bubble for now. */
    transcript: string
}

/**
 * A voice message the user sent. The audio is fetched only on the first play, so opening a long
 * conversation does not pull every recording in it.
 */
export function VoiceMessageBubble({ agentId, rawUrlFor, src, durationMs, peaks }: VoiceMessageBubbleProps) {
    const rawUrl = rawUrlResolver(agentId, rawUrlFor)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const objectUrlRef = useRef<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [playing, setPlaying] = useState(false)
    const [elapsedMs, setElapsedMs] = useState(0)

    useEffect(
        () => () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        },
        []
    )

    // The engine streams the file whole with no range support, and a MediaRecorder webm carries no
    // duration in its header. Loading the bytes into a blob URL sidesteps both: the browser holds
    // the whole recording and can seek inside it.
    const load = useCallback(async () => {
        if (objectUrlRef.current || !rawUrl) return objectUrlRef.current
        setLoading(true)
        try {
            const res = await fetch(rawUrl(src))
            if (!res.ok) throw new Error('Could not load this recording')
            const url = URL.createObjectURL(await res.blob())
            objectUrlRef.current = url
            return url
        } finally {
            setLoading(false)
        }
    }, [rawUrl, src])

    const toggle = useCallback(async () => {
        const audio = audioRef.current
        if (!audio) return
        if (playing) {
            audio.pause()
            return
        }
        if (!audio.src) {
            const url = await load().catch(() => null)
            if (!url) return
            audio.src = url
        }
        await audio.play().catch(() => {})
    }, [load, playing])

    const seek = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const audio = audioRef.current
            if (!audio?.src || durationMs <= 0) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
            audio.currentTime = (ratio * durationMs) / 1000
            setElapsedMs(ratio * durationMs)
        },
        [durationMs]
    )

    const progress = durationMs > 0 ? Math.min(1, elapsedMs / durationMs) : 0
    const levels = peaks.length > 0 ? peaks : Array.from({ length: PEAK_COUNT }, () => 0.25)

    return (
        <div className="flex min-w-0 items-center gap-2.5">
            <button
                type="button"
                onClick={() => void toggle()}
                disabled={!rawUrl || loading}
                aria-label={playing ? 'Pause' : 'Play voice message'}
                className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20 disabled:opacity-50 in-data-ink:bg-white/15 in-data-ink:text-white in-data-ink:hover:bg-white/25"
            >
                {loading ? <Spinner /> : playing ? <PauseIcon className="size-4" /> : <Play className="size-4" />}
                {playing && <BorderBeam animated pattern="arcs" tone="neutral" width={1} duration={3} />}
            </button>

            <button type="button" onClick={seek} aria-label="Seek" className="flex w-32 shrink-0 cursor-pointer items-center text-foreground in-data-ink:text-white sm:w-40">
                <VoiceWaveform peaks={levels} progress={progress} />
            </button>

            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground in-data-ink:text-white/70">{formatVoiceDuration(playing || elapsedMs > 0 ? elapsedMs : durationMs)}</span>

            <audio
                ref={audioRef}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                    setPlaying(false)
                    setElapsedMs(0)
                }}
                onTimeUpdate={event => setElapsedMs(event.currentTarget.currentTime * 1000)}
                className="hidden"
            />
        </div>
    )
}
