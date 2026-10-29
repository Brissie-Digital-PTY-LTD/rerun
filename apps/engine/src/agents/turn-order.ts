import type { Provider } from '@rerun/contracts'

export type TurnOrder = 'message-first' | 'call-first'

// A GPT model ends its reply on the message it writes, on Codex as on any API: a call meant to come
// after the message is often never made (3 turns in 9 on GPT-6 Sol announced a card they never
// sent), so there the calls come first. Every other model writes its message, then makes the calls
// that close the turn.
const ENDS_ON_ITS_MESSAGE = /^(openai\/)?(gpt-|o\d)/i

// `model` is the one that answers: behind a Rerun alias, the model the hub serves it with.
export function turnOrder(provider: Provider, model: string): TurnOrder {
    return provider === 'codex' || ENDS_ON_ITS_MESSAGE.test(model) ? 'call-first' : 'message-first'
}

// Repeated on each card that closes a turn: a model on an API provider reads a tool's own text more
// closely than the prompt, and without it ends its reply on the message that announces the card.
export function cardCallTiming(order: TurnOrder): string {
    return order === 'call-first'
        ? 'Call it before writing your message, which then ends your turn.'
        : 'Call it in the same reply as your message, right after it: a reply that stops at the message never sends the card.'
}
