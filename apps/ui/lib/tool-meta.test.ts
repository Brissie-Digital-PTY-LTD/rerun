import { describe, expect, it } from 'vitest'
import { getToolMeta, isKnownTool } from './tool-meta'
import { BookOpenIcon, CoinsIcon, MailIcon } from '@/lib/icons'

describe('getToolMeta', () => {
    it('falls back to a plain paid data row when the capability is unknown or missing', () => {
        expect(getToolMeta('paid_data', { capability: 'tiktok.followers' })).toEqual({ label: 'Paid data', icon: CoinsIcon })
        expect(getToolMeta('paid_data')).toEqual({ label: 'Paid data', icon: CoinsIcon })
    })

    it('shows a catalog read as a read, never as a purchase', () => {
        expect(getToolMeta('paid_data_catalog', { group: 'tiktok' })).toEqual({ label: 'Paid data catalog', icon: BookOpenIcon })
        expect(isKnownTool('paid_data_catalog')).toBe(true)
        expect(getToolMeta('paid_data_read', { saved: '.rerun/paid-data/x.json' })).toEqual({ label: 'Read paid data', icon: BookOpenIcon })
    })

    it('keeps the tools stored conversations still hold', () => {
        expect(getToolMeta('leads_email_find')).toEqual({ label: 'Find Email', icon: MailIcon })
        expect(isKnownTool('paid_data')).toBe(true)
    })
})
