import { describe, expect, it } from 'vitest'
import { brainAuthorLabel, brainSlugify, brainSourceLabel, brainSourceLabels } from './labels'

describe('brainSourceLabel', () => {
    it('names the research tags in plain words', () => {
        expect(brainSourceLabel('site:pricing')).toBe('Pricing page')
        expect(brainSourceLabel('site:meta')).toBe('Website')
        expect(brainSourceLabel('site')).toBe('Website')
        expect(brainSourceLabel('linkedin:company')).toBe('LinkedIn page')
        expect(brainSourceLabel('google:business')).toBe('Google Business Profile')
        expect(brainSourceLabel('stack')).toBe('Website tools')
        expect(brainSourceLabel('site:catalog')).toBe('Product catalog')
        expect(brainSourceLabel('catalog')).toBe('Product catalog')
    })

    it('shows a link by its host and path, shortened', () => {
        expect(brainSourceLabel('https://www.acme.com/blog/launch/')).toBe('acme.com/blog/launch')
        expect(brainSourceLabel('https://shop.acme.com/products/coussin-anti-chute-bebe-dragon-bleu-et-rose')).toBe('shop.acme.com/products/coussin-anti-chu…')
    })

    it('keeps a source it does not know as written', () => {
        expect(brainSourceLabel('Call with Marie')).toBe('Call with Marie')
    })
})

describe('brainSourceLabels', () => {
    it('merges tags that read the same', () => {
        expect(brainSourceLabels(['site:meta', 'stack', 'site:home', 'linkedin:company'])).toEqual(['Website', 'Website tools', 'LinkedIn page'])
    })
})

describe('labels', () => {
    it('names the author of a page', () => {
        expect(brainAuthorLabel('seed')).toBe('Rerun, from your website')
        expect(brainAuthorLabel('agent:Sales')).toBe('Sales')
        expect(brainAuthorLabel('agent:foreman')).toBe('Rerun coworker')
        expect(brainAuthorLabel('user:ana@acme.com')).toBe('ana@acme.com')
        expect(brainAuthorLabel('user')).toBe('user')
    })

    it('turns a title into a page slug', () => {
        expect(brainSlugify('  Équipe & Fondateurs!! ')).toBe('equipe-fondateurs')
    })
})
