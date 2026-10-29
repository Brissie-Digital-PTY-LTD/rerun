import { BRAIN_CARD_TYPES, FOREMAN_AGENT_ID, type BrainPageType } from '@rerun/contracts'

export const BRAIN_PAGE_TYPE_LABELS: Record<BrainPageType, string> = {
    company: 'Company',
    offering: 'Offering',
    market: 'Market',
    team: 'Team',
    voice: 'Voice',
    stack: 'Tools',
    priorities: 'Priorities',
    customer: 'Customer',
    competitor: 'Competitor',
    person: 'Person',
    product: 'Product',
    decision: 'Decision',
    note: 'Note',
}

export const isCardType = (type: BrainPageType) => (BRAIN_CARD_TYPES as readonly string[]).includes(type)

// The engine stores who wrote a page as `seed`, `user:<email>` or `agent:<name>`. The foreman
// writes as `agent:foreman`, a name the user never sees.
export function brainAuthorLabel(author: string): string {
    if (author === 'seed') return 'Rerun, from your website'
    if (author === `agent:${FOREMAN_AGENT_ID}`) return 'Rerun coworker'
    if (author.startsWith('agent:')) return author.slice('agent:'.length)
    if (author.startsWith('user:')) return author.slice('user:'.length)
    return author
}

const SITE_PAGE_LABELS: Record<string, string> = {
    about: 'About page',
    team: 'Team page',
    pricing: 'Pricing page',
    customers: 'Customers page',
    product: 'Product page',
    catalog: 'Product catalog',
    legal: 'Legal notice',
    careers: 'Careers page',
    contact: 'Contact page',
    privacy: 'Privacy policy',
    blog: 'Blog',
}

const SOURCE_LABELS: Record<string, string> = {
    dns: 'Email setup',
    stack: 'Website tools',
    search: 'Web search',
    catalog: 'Product catalog',
    registry: 'Company registry',
    linkedin: 'LinkedIn',
    'linkedin:company': 'LinkedIn page',
    'linkedin:person': 'Your LinkedIn',
    google: 'Google',
    'google:business': 'Google Business Profile',
}

const URL_LABEL_MAX = 40

// A product page's own address would stretch the badge across the page.
function urlLabel(tag: string): string | null {
    if (!/^https?:\/\//i.test(tag.trim())) return null
    try {
        const url = new URL(tag.trim())
        const label = `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`
        return label.length > URL_LABEL_MAX ? `${label.slice(0, URL_LABEL_MAX - 1)}…` : label
    } catch {
        return null
    }
}

// The website research tags its facts `site:<what>`, `linkedin:company`… A link is shown by its
// host and path; anything else, such as a source an agent cited, is shown as written.
export function brainSourceLabel(tag: string): string {
    const normalized = tag.trim().toLowerCase()
    if (normalized === 'site' || normalized.startsWith('site:')) return SITE_PAGE_LABELS[normalized.slice('site:'.length)] ?? 'Website'
    return SOURCE_LABELS[normalized] ?? urlLabel(tag) ?? tag
}

export function brainSourceLabels(tags: readonly string[]): string[] {
    return [...new Set(tags.map(brainSourceLabel))]
}

export function brainSlugify(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64)
        .replace(/-+$/, '')
}
