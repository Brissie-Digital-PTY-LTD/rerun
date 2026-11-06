import type Stripe from 'stripe'
import type { Database } from '@/app/api/database.types'
import { createServiceRoleClient } from '@/supabase/serviceRole'
import { selectMaybeSingle } from '@/supabase/supabase-helpers'

// The plan handlers never needed this: they are full-state updates keyed on the subscription, so a
// replay converges. A purchase is not — inserting a sale twice doubles a creator's revenue.
//
// The row is claimed before the handler runs and stamped after it succeeds. A duplicate delivery of
// an already-processed event is dropped; a retry of an event whose handler crashed still runs,
// because `processed_at` stayed null.
//
// A claim younger than the lease belongs to a delivery still running: a second one arriving meanwhile
// is answered 409, so Stripe tries it again later instead of reading it as delivered. Past the lease
// the claim is taken over, by one delivery only: the update matches the `claimed_at` it read.

type StripeEventInsert = Database['public']['Tables']['stripe_events']['Insert']
type StripeEventUpdate = Database['public']['Tables']['stripe_events']['Update']

const CLAIM_LEASE_MS = 5 * 60_000

export type StripeEventClaim = 'claimed' | 'processed' | 'in_flight'

export async function claimStripeEvent(event: Stripe.Event, now = new Date()): Promise<StripeEventClaim> {
    const supabase = createServiceRoleClient()
    const { error } = await supabase
        .from('stripe_events')
        .insert<StripeEventInsert>({ id: event.id, type: event.type, connected_account_id: event.account ?? null, claimed_at: now.toISOString() })

    if (!error) return 'claimed'

    const { data } = await selectMaybeSingle(supabase, 'stripe_events', ['processed_at', 'claimed_at'] as const, { id: event.id })
    // No row at all means the insert failed for another reason; running the handler is safer than
    // silently dropping a real event.
    if (!data) return 'claimed'
    if (data.processed_at) return 'processed'
    if (now.getTime() - Date.parse(data.claimed_at) < CLAIM_LEASE_MS) return 'in_flight'

    const { data: takenOver } = await supabase
        .from('stripe_events')
        .update<StripeEventUpdate>({ claimed_at: now.toISOString() })
        .eq('id', event.id)
        .eq('claimed_at', data.claimed_at)
        .is('processed_at', null)
        .select('id')
    return takenOver?.length ? 'claimed' : 'in_flight'
}

// What a delivery that did not get the claim answers.
export function unclaimedResponse(claim: Exclude<StripeEventClaim, 'claimed'>): Response {
    return claim === 'processed' ? Response.json({ received: true, duplicate: true }, { status: 200 }) : Response.json({ error: 'Event already being processed' }, { status: 409 })
}

export async function markStripeEventProcessed(eventId: string): Promise<void> {
    const supabase = createServiceRoleClient()
    await supabase.from('stripe_events').update<StripeEventUpdate>({ processed_at: new Date().toISOString() }).eq('id', eventId)
}

// A handler that threw must leave no claim behind, or Stripe's retry would be dropped as a
// duplicate and the event lost for good.
export async function releaseStripeEvent(eventId: string): Promise<void> {
    const supabase = createServiceRoleClient()
    await supabase.from('stripe_events').delete().eq('id', eventId)
}
