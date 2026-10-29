'use client'

import { getAgentKeysAction, updateAgentKeysAction } from '@/app/api/_actions/agent.actions'
import { serializeSecretResult } from '@/lib/chat-hitl'
import { SecretRequestBlock as SecretRequestBlockBase, type SecretRequestItem } from '@rerun/ui/chat'
import { useEffect, useState } from 'react'

type SecretRequestBlockProps = {
    agentId: string
    secrets: SecretRequestItem[]
    reason?: string
    // Called once the credentials are stored on the engine, with the summary chat message that
    // resumes the run. It only ever carries variable names, never a value.
    onDone: (summary: string) => void
    onSkip: () => void
    onDismiss: () => void
    inline?: boolean
}

export function SecretRequestBlock({ agentId, secrets, reason, onDone, onSkip, onDismiss, inline }: SecretRequestBlockProps) {
    const [existingKeys, setExistingKeys] = useState<string[]>([])

    useEffect(() => {
        let cancelled = false
        getAgentKeysAction(agentId).then(result => {
            if (!cancelled) setExistingKeys(result.keys)
        })
        return () => {
            cancelled = true
        }
    }, [agentId])

    return (
        <SecretRequestBlockBase
            secrets={secrets}
            reason={reason}
            existingKeys={existingKeys}
            inline={inline}
            onSubmit={async values => {
                const result = await updateAgentKeysAction(agentId, { set: values })
                if (!result.success) throw new Error(result.error ?? 'Could not save the credentials')
                onDone(serializeSecretResult(secrets, Object.keys(values)))
            }}
            onSkip={onSkip}
            onDismiss={onDismiss}
        />
    )
}
