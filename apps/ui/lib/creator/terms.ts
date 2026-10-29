import { landingUrl } from '@/lib/site'

// What a creator ticks before their sandbox opens. Display only: acceptance is a single timestamp
// on the fiche, so this list can be reworded freely. Changing what it *means* is a new version of
// the program, announced to the creators, not re-signed retroactively.
export type CreatorTerm = {
    id: string
    label: string
    href?: string
}

export const CREATOR_TERMS: readonly CreatorTerm[] = [
    { id: 'terms', label: 'I accept the Rerun Creator Terms and the Marketplace Terms', href: landingUrl('/marketplace-terms') },
    { id: 'cadence', label: 'I commit to publishing at least one template per month' },
    { id: 'quality', label: 'Every template I submit is tested and works end to end' },
    { id: 'sandbox', label: 'My sandbox is for building and capturing templates, not for client work' },
]
