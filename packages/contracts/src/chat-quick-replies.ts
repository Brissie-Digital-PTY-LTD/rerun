import { z } from 'zod'

import { stripBridgePrefix } from './chat-tool-name.js'

export const QUICK_REPLIES_TOOL = 'suggest_replies'
export const QUICK_REPLIES_MAX = 3
export const QUICK_REPLY_MAX_LENGTH = 40

// The replies close the coworker's message as a <quick_replies> block the engine cuts out of the
// text; they reach the chat and the stored row as a call of this name, which is what the chat reads.
// Loose on purpose: the limits are checked in `parseQuickReplies`.
export const quickRepliesInputSchema = z.object({
    replies: z.array(z.string()).describe(`1 to ${QUICK_REPLIES_MAX} replies the user can send in one click, each under ${QUICK_REPLY_MAX_LENGTH} characters.`),
})

export type QuickRepliesResult = { ok: true; replies: string[] } | { ok: false; reason: string }

// The engine keeps a block and the chat draws the chips through this one reading, so a list out of
// bounds never shows up as buttons.
export function parseQuickReplies(input: unknown): QuickRepliesResult {
    const parsed = quickRepliesInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, reason: 'replies must be a list of strings.' }

    const seen = new Set<string>()
    const replies: string[] = []
    for (const raw of parsed.data.replies) {
        const reply = raw.trim()
        const key = reply.toLowerCase()
        if (!reply || seen.has(key)) continue
        seen.add(key)
        replies.push(reply)
    }

    if (replies.length === 0) return { ok: false, reason: 'no reply given.' }
    if (replies.length > QUICK_REPLIES_MAX) return { ok: false, reason: `${replies.length} replies given, ${QUICK_REPLIES_MAX} at most.` }
    const tooLong = replies.find(reply => reply.length > QUICK_REPLY_MAX_LENGTH)
    if (tooLong) return { ok: false, reason: `"${tooLong}" is longer than ${QUICK_REPLY_MAX_LENGTH} characters.` }
    return { ok: true, replies }
}

type QuickRepliesPart = { type: string; toolName?: string; state?: string; input?: unknown }

function isQuickRepliesPart(part: QuickRepliesPart): boolean {
    const name = part.toolName ?? (part.type.startsWith('tool-') ? part.type.slice('tool-'.length) : '')
    return stripBridgePrefix(name) === QUICK_REPLIES_TOOL
}

// The last valid call wins: a refused call the model corrected right after leaves its first try in
// the parts. An input still streaming is not a set of replies yet.
export function quickRepliesOf(message: { role: string; parts: readonly unknown[] }): string[] {
    if (message.role !== 'assistant') return []
    for (let i = message.parts.length - 1; i >= 0; i--) {
        const part = message.parts[i] as QuickRepliesPart
        if (typeof part?.type !== 'string' || !isQuickRepliesPart(part) || part.state === 'input-streaming') continue
        const result = parseQuickReplies(part.input)
        if (result.ok) return result.replies
    }
    return []
}
