import type { PhoneChannel } from './app-auth.js'

// Who a message goes out as: Bird Verify's shared identity for codes, or Rerun's own WhatsApp
// Business number for everything else. They are not refused in the same countries.
export type PhoneSender = 'verify' | 'rerun'

const ALL_CHANNELS: readonly PhoneChannel[] = ['whatsapp', 'sms']

// No sender gets through: WhatsApp is blocked in China, and no SMS code ever arrived (PostHog, October 2026).
const UNREACHABLE: Partial<Record<string, readonly PhoneChannel[]>> = { CN: ['whatsapp', 'sms'] }

// Bird's shared WhatsApp sender carries no passcode there (https://bird.com/docs/guides/verify/countries,
// list as of October 1, 2026). Rerun's own number does deliver there.
const VERIFY_WHATSAPP_REFUSED: ReadonlySet<string> = new Set(['AE', 'BD', 'EG', 'ID', 'IN', 'IQ', 'KW', 'KZ', 'LK', 'MA', 'MY', 'NG', 'NP', 'OM', 'PK', 'SA', 'UA', 'ZA'])

function refusedChannels(country: string, sender: PhoneSender): PhoneChannel[] {
    const refused = [...(UNREACHABLE[country] ?? [])]
    if (sender === 'verify' && VERIFY_WHATSAPP_REFUSED.has(country)) refused.push('whatsapp')
    return refused
}

// `country` is an ISO 3166 alpha-2 code. A country the number does not name keeps every channel:
// nothing says it is out of reach.
export function reachableChannels(country: string | undefined, sender: PhoneSender): PhoneChannel[] {
    if (!country) return [...ALL_CHANNELS]
    const refused = refusedChannels(country, sender)
    return ALL_CHANNELS.filter(channel => !refused.includes(channel))
}
