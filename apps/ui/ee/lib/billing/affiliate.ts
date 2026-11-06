import { AFFILIATE_REFERRAL_COOKIE, AFFILIATE_REFERRAL_METADATA_KEY } from '@rerun/contracts'
import { cookies } from 'next/headers'

// Affonso credits an affiliate by finding its referral id in the metadata of the Stripe object that
// bills. Spread into that metadata rather than assigned: a visitor nobody referred must leave no
// empty key behind, which Affonso would read as a referral it cannot resolve.
export async function affiliateReferralMetadata(): Promise<Record<string, string>> {
    const referral = (await cookies()).get(AFFILIATE_REFERRAL_COOKIE)?.value
    return referral ? { [AFFILIATE_REFERRAL_METADATA_KEY]: referral } : {}
}
