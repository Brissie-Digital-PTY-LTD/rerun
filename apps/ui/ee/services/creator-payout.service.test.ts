import { beforeEach, describe, expect, it, vi } from 'vitest'

import { stripe } from '@/ee/lib/billing/stripe'
import { reverseCreatorTransfer, transferSaleToCreator } from './creator-payout.service'

vi.mock('@/ee/lib/billing/stripe', async importOriginal => ({ ...(await importOriginal<typeof import('@/ee/lib/billing/stripe')>()), stripe: (await import('@/ee/test/stripe-fake')).fakeStripe() }))

const SALE = { chargeId: 'ch_1', connectedAccountId: 'acct_1', grossCents: 1000, taxCents: 0, currency: 'usd', metadata: { kind: 'template_purchase' } }

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(stripe.transfers.create).mockResolvedValue({ id: 'tr_1' } as never)
    vi.mocked(stripe.charges.retrieve).mockResolvedValue({ amount: 1200, balance_transaction: { amount: 1200, currency: 'usd' } } as never)
})

describe('transferSaleToCreator', () => {
    it('transfers the net of tax and fee, keyed on the charge', async () => {
        await expect(transferSaleToCreator({ ...SALE, grossCents: 1200, taxCents: 200 })).resolves.toEqual({ taxCents: 200, feeCents: 80, netCents: 920, transferId: 'tr_1' })
        expect(stripe.transfers.create).toHaveBeenCalledWith(
            { amount: 920, currency: 'usd', destination: 'acct_1', source_transaction: 'ch_1', metadata: SALE.metadata },
            { idempotencyKey: 'template-transfer-ch_1' },
        )
    })

    it('transfers in the currency the charge settled in, at the rate Stripe applied', async () => {
        vi.mocked(stripe.charges.retrieve).mockResolvedValue({ amount: 1200, balance_transaction: { amount: 1066, currency: 'eur' } } as never)
        await expect(transferSaleToCreator({ ...SALE, grossCents: 1200, taxCents: 200 })).resolves.toEqual({ taxCents: 200, feeCents: 80, netCents: 920, transferId: 'tr_1' })
        expect(stripe.charges.retrieve).toHaveBeenCalledWith('ch_1', { expand: ['balance_transaction'] })
        expect(stripe.transfers.create).toHaveBeenCalledWith(
            { amount: 817, currency: 'eur', destination: 'acct_1', source_transaction: 'ch_1', metadata: SALE.metadata },
            { idempotencyKey: 'template-transfer-ch_1' },
        )
    })

    it('throws rather than transfer against a charge that has not settled', async () => {
        vi.mocked(stripe.charges.retrieve).mockResolvedValue({ amount: 1200, balance_transaction: null } as never)
        await expect(transferSaleToCreator({ ...SALE, grossCents: 1200, taxCents: 200 })).rejects.toThrow('has not settled yet')
        expect(stripe.transfers.create).not.toHaveBeenCalled()
    })

    it('transfers nothing without a charge', async () => {
        await expect(transferSaleToCreator({ ...SALE, chargeId: null })).resolves.toMatchObject({ netCents: 920, transferId: null })
        expect(stripe.charges.retrieve).not.toHaveBeenCalled()
        expect(stripe.transfers.create).not.toHaveBeenCalled()
    })

    it('transfers nothing without a connected account', async () => {
        await expect(transferSaleToCreator({ ...SALE, connectedAccountId: null })).resolves.toMatchObject({ transferId: null })
        expect(stripe.transfers.create).not.toHaveBeenCalled()
    })

    it('transfers nothing when the fee eats the whole sale', async () => {
        await expect(transferSaleToCreator({ ...SALE, grossCents: 25 })).resolves.toEqual({ taxCents: 0, feeCents: 25, netCents: 0, transferId: null })
        expect(stripe.transfers.create).not.toHaveBeenCalled()
    })
})

describe('reverseCreatorTransfer', () => {
    it('reverses nothing for a zero refund or a zero charge', async () => {
        await expect(reverseCreatorTransfer('tr_1', 0, 1000)).resolves.toBe(0)
        await expect(reverseCreatorTransfer('tr_1', 500, 0)).resolves.toBe(0)
        expect(stripe.transfers.retrieve).not.toHaveBeenCalled()
    })

    it('takes back the whole transfer on a full refund, minus what was already reversed', async () => {
        vi.mocked(stripe.transfers.retrieve).mockResolvedValue({ amount: 920, amount_reversed: 120 } as never)
        await expect(reverseCreatorTransfer('tr_1', 1000, 1000)).resolves.toBe(800)
        expect(stripe.transfers.createReversal).toHaveBeenCalledWith('tr_1', { amount: 800 }, { idempotencyKey: 'template-reversal-tr_1-1000' })
    })

    it('takes back a rounded share on a partial refund', async () => {
        vi.mocked(stripe.transfers.retrieve).mockResolvedValue({ amount: 920, amount_reversed: 0 } as never)
        await expect(reverseCreatorTransfer('tr_1', 333, 1000)).resolves.toBe(306)
        expect(stripe.transfers.createReversal).toHaveBeenCalledWith('tr_1', { amount: 306 }, { idempotencyKey: 'template-reversal-tr_1-333' })
    })

    it('reverses nothing when the transfer was already reversed that far', async () => {
        vi.mocked(stripe.transfers.retrieve).mockResolvedValue({ amount: 920, amount_reversed: 920 } as never)
        await expect(reverseCreatorTransfer('tr_1', 500, 1000)).resolves.toBe(0)
        expect(stripe.transfers.createReversal).not.toHaveBeenCalled()
    })
})
