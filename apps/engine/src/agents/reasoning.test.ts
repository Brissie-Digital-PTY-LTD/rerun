import { describe, expect, it } from 'vitest'
import { applyCaching } from './caching.js'
import { mergeProviderOptions, reasoningProviderOptions } from './reasoning.js'

describe('reasoning provider options', () => {
    it('asks each API provider for its reasoning in its own dialect', () => {
        expect(reasoningProviderOptions('anthropic')).toEqual({ anthropic: { thinking: { type: 'adaptive', display: 'summarized' } } })
        expect(reasoningProviderOptions('openai')).toEqual({ openai: { reasoningSummary: 'auto' } })
        expect(reasoningProviderOptions('google')).toEqual({ google: { thinkingConfig: { includeThoughts: true } } })
    })

    it('leaves the providers that are configured elsewhere alone', () => {
        // The two CLIs take it through `defaultSettings`, the two OpenRouter ones through the body.
        expect(reasoningProviderOptions('claude')).toBeUndefined()
        expect(reasoningProviderOptions('codex')).toBeUndefined()
        expect(reasoningProviderOptions('rerun')).toBeUndefined()
        expect(reasoningProviderOptions('openrouter')).toBeUndefined()
    })

    it('keeps the prompt cache key when both write under the same provider', () => {
        const cached = applyCaching('openai', { system: { stable: 'be useful', volatile: '' }, messages: [], sessionId: 'session-1' })

        expect(mergeProviderOptions(cached.providerOptions, { openai: { reasoningSummary: 'auto' } })).toEqual({
            openai: { promptCacheKey: 'session-1', reasoningSummary: 'auto' },
        })
    })

    it('merges when either side is missing', () => {
        expect(mergeProviderOptions(undefined, { openai: { reasoningSummary: 'auto' } })).toEqual({ openai: { reasoningSummary: 'auto' } })
        expect(mergeProviderOptions({ openai: { promptCacheKey: 'session-1' } }, undefined)).toEqual({ openai: { promptCacheKey: 'session-1' } })
        expect(mergeProviderOptions(undefined, undefined)).toBeUndefined()
    })

    it('does not touch the anthropic cache breakpoints, which may never land on a thinking block', () => {
        const cached = applyCaching('anthropic', { system: { stable: 'be useful', volatile: '' }, messages: [{ role: 'user', content: 'hi' }], sessionId: 'session-1' })
        const merged = mergeProviderOptions(cached.providerOptions, reasoningProviderOptions('anthropic'))

        expect(merged).toEqual({ anthropic: { thinking: { type: 'adaptive', display: 'summarized' } } })
        expect(cached.messages.filter(m => m.providerOptions?.anthropic)).toHaveLength(1)
        expect(cached.messages.at(-1)?.role).toBe('user')
    })
})
