'use client'

import { PromptInputButton } from '@/components/ai-elements/prompt-input'
import { Spinner } from '@/components/ui/spinner'
import type { VoiceMessageStatus } from '@/hooks/useVoiceMessage'
import { MicIcon, RefreshCcwIcon, SendIcon, XIcon } from '@/lib/icons'

type VoiceComposerControlsProps = {
    status: VoiceMessageStatus
    /** Attachments alone make a message, so Send stays and the microphone steps back beside it. */
    besideSend?: boolean
    onStart: () => void
    onFinish: () => void
    onRetry: () => void
    onDiscard: () => void
}

/**
 * The composer's voice controls: the microphone that takes the send button's place on an empty
 * composer (or sits next to it when only attachments are there), and the discard / confirm pair
 * that replaces it while recording. The microphone and the confirm both use the send button's own
 * variant and size, so the rightmost control keeps its shape all the way through: only the glyph
 * inside it changes.
 */
export function VoiceComposerControls({ status, besideSend = false, onStart, onFinish, onRetry, onDiscard }: VoiceComposerControlsProps) {
    if (status === 'idle') {
        return (
            <PromptInputButton variant={besideSend ? 'ghost' : 'default'} tooltip="Record a voice message" aria-label="Record a voice message" onClick={onStart}>
                <MicIcon className="size-4" />
            </PromptInputButton>
        )
    }

    const busy = status === 'starting' || status === 'processing'

    return (
        <>
            <PromptInputButton tooltip="Discard" aria-label="Discard recording" onClick={onDiscard} disabled={status === 'processing'}>
                <XIcon className="size-4" />
            </PromptInputButton>
            <PromptInputButton
                variant="default"
                tooltip={status === 'failed' ? 'Retry' : 'Send'}
                aria-label={status === 'failed' ? 'Retry sending the recording' : 'Send the recording'}
                onClick={status === 'failed' ? onRetry : onFinish}
                disabled={busy}
            >
                {busy ? <Spinner /> : status === 'failed' ? <RefreshCcwIcon className="size-4" /> : <SendIcon className="size-4" />}
            </PromptInputButton>
        </>
    )
}
