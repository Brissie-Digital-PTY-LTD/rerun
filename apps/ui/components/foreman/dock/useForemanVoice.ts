'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { transcribeVoiceRecording } from '@/lib/voice/client'
import { useForemanStore } from '@/stores/foreman.store'

import { usePushToTalk } from './usePushToTalk'

export type ForemanVoiceStatus = 'idle' | 'listening' | 'transcribing'

/**
 * Space held on the board records, letting go transcribes and hands the words to the Foreman as if
 * they had been typed in the pill. Only the transcript travels: the recording is not kept.
 */
export function useForemanVoice(enabled: boolean) {
    const [listening, setListening] = useState(false)
    const [transcribing, setTranscribing] = useState(false)

    // The recorder calls finish when it hits its length cap, and finish needs the recorder to stop.
    const finishRef = useRef<() => void>(() => {})
    const recorder = useVoiceRecorder({
        onError: message => {
            setListening(false)
            toast.error(message)
        },
        onLimitReached: () => finishRef.current(),
    })
    const { start, stop, cancel } = recorder

    const begin = useCallback(() => {
        setListening(true)
        useForemanStore.getState().engage()
        void start()
    }, [start])

    const finish = useCallback(async () => {
        setListening(false)
        setTranscribing(true)
        try {
            // Null when Space was let go before the microphone came up: there is nothing to send.
            const recording = await stop()
            if (!recording) return
            const transcript = await transcribeVoiceRecording(recording.blob, recording.format.transcriptionFormat)
            if (!transcript) {
                toast.error("Couldn't hear anything in that recording.")
                return
            }
            useForemanStore.getState().sendToForeman(transcript)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not send your voice message.')
        } finally {
            setTranscribing(false)
        }
    }, [stop])

    useEffect(() => {
        finishRef.current = () => void finish()
    })

    const abort = useCallback(() => {
        setListening(false)
        cancel()
    }, [cancel])

    usePushToTalk({ enabled: enabled && !transcribing, onStart: begin, onRelease: () => void finish(), onAbort: abort })

    const status: ForemanVoiceStatus = transcribing ? 'transcribing' : listening ? 'listening' : 'idle'
    return { status, stream: recorder.stream }
}
