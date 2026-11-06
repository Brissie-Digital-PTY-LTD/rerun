import { type SaleSplit, splitSale } from '@rerun/contracts'
import type Stripe from 'stripe'
import { stripe } from '@/ee/lib/billing/stripe'

// The creator's half of the money, moved by hand rather than by `transfer_data`.
//
// The charge Rerun receives carries the buyer's local tax, whose amount is only known once they have
// entered their country and VAT number inside Checkout. A destination charge would have had to commit
// to a transfer amount before that, and would have sent the tax to the creator along with the rest.
// So Rerun takes the whole charge and transfers what is actually owed, from the webhook that sees the
// settled amounts. `source_transaction` ties the transfer to its charge, which lets Stripe hold it
// until the funds clear instead of demanding an available platform balance.

type TransferParams = {
    chargeId: string | null
    connectedAccountId: string | null
    grossCents: number
    taxCents: number
    currency: string
    metadata: Stripe.MetadataParam
}

export async function transferSaleToCreator(params: TransferParams): Promise<SaleSplit & { transferId: string | null }> {
    const split = splitSale(params.grossCents, params.taxCents)
    if (!params.chargeId || !params.connectedAccountId || split.netCents <= 0) return { ...split, transferId: null }

    // The buyer is back in the app before Stripe has delivered the webhook, so both paths reach this
    // function for the same sale. Keyed on the charge, the second call returns the first transfer
    // instead of paying the creator twice.
    const settled = await settledTransferAmount(params.chargeId, split.netCents, params.currency)
    const transfer = await stripe.transfers.create(
        {
            amount: settled.amount,
            currency: settled.currency,
            destination: params.connectedAccountId,
            source_transaction: params.chargeId,
            metadata: params.metadata,
        },
        { idempotencyKey: `template-transfer-${params.chargeId}` },
    )

    return { ...split, transferId: transfer.id }
}

// A transfer tied to a `source_transaction` must be in the currency the charge settled in, not the
// one the buyer paid in. Rerun's balance is in euros, so a dollar sale settles in euros and the
// creator's share is converted at the rate Stripe actually applied to that charge.
async function settledTransferAmount(chargeId: string, netCents: number, saleCurrency: string): Promise<{ amount: number; currency: string }> {
    const charge = await stripe.charges.retrieve(chargeId, { expand: ['balance_transaction'] })
    const settlement = charge.balance_transaction
    if (!settlement || typeof settlement === 'string') throw new Error(`Charge ${chargeId} has not settled yet, the transfer will be retried.`)

    if (settlement.currency === saleCurrency || charge.amount <= 0) return { amount: netCents, currency: saleCurrency }
    return { amount: Math.round((netCents * settlement.amount) / charge.amount), currency: settlement.currency }
}

// Money already handed to a creator does not come back on its own: a refund is paid out of the
// platform balance and leaves the transfer untouched. This takes back the creator's share, in
// proportion to what was actually refunded.
//
// Written against the transfer's own `amount_reversed` rather than against our ledger, so it is
// equally correct on a replayed webhook and on a refund an operator issued from the Stripe dashboard
// with "reverse transfer" already ticked.
export async function reverseCreatorTransfer(transferId: string, refundedCents: number, chargedCents: number): Promise<number> {
    if (refundedCents <= 0 || chargedCents <= 0) return 0

    const transfer = await stripe.transfers.retrieve(transferId)
    const target = refundedCents >= chargedCents ? transfer.amount : Math.round((transfer.amount * refundedCents) / chargedCents)
    const missing = target - transfer.amount_reversed
    if (missing <= 0) return 0

    await stripe.transfers.createReversal(
        transferId,
        { amount: missing },
        { idempotencyKey: `template-reversal-${transferId}-${refundedCents}` },
    )
    return missing
}
