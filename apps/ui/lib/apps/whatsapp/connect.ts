import { getMe, login, type LinkupLoginResult } from '@/lib/apps/linkup/client'

// How a WhatsApp number is linked at Linkup, as a linked device of the phone (the way WhatsApp Web
// is), and what it is known by once it is.

// The number sets the country Linkup links it from. A pairing code replaces the QR code when the
// person is on the very phone they would have to scan with.
export function loginWhatsapp({ phoneNumber, pairingCode }: { phoneNumber: string; pairingCode: boolean }, accountName: string): Promise<LinkupLoginResult> {
    return login('whatsapp', { phone_number: phoneNumber, account_name: accountName, ...(pairingCode ? { params: { pairing_code: true } } : {}) })
}

type WhatsappMe = { phone_number: string; jid?: string; name?: string | null }

// The member id is the number itself: one free trial per number, one connection per number and per
// workspace.
export async function whatsappProfile(accountId: string): Promise<{ label: string; memberId: string }> {
    const me = await getMe<WhatsappMe>(accountId)
    const number = `+${me.phone_number.replace(/^\+/, '')}`
    return { label: me.name ? `${me.name} (${number})` : number, memberId: me.phone_number.replace(/^\+/, '') }
}

export const WHATSAPP_WEBHOOK_EVENTS = ['message_received'] as const

export function whatsappSignInRefusal(message: string): string {
    if (/expired/i.test(message)) return 'The code expired before the phone linked. Ask for a new one and scan it within three minutes.'
    if (/refused|denied/i.test(message)) return 'WhatsApp refused to link this number. Check it on the phone, then try again.'
    if (/phone|number/i.test(message)) return `WhatsApp refused this number: ${message}`
    return `WhatsApp refused the link: ${message}`
}
