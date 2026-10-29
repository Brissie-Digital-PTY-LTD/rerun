import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { embed } from 'ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { embedText } from './embed'

vi.mock('@ai-sdk/openai-compatible', () => ({
    createOpenAICompatible: vi.fn(() => ({ textEmbeddingModel: vi.fn(() => 'embedding-model') })),
}))

vi.mock('ai', () => ({ embed: vi.fn(async () => ({ embedding: [0.1, 0.2] })) }))

const originalEmbedKey = process.env.RERUN_EMBED_API_KEY
const originalOpenRouterKey = process.env.OPENROUTER_API_KEY

describe('embedText', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.OPENROUTER_API_KEY = 'max-key'
        process.env.RERUN_EMBED_API_KEY = 'embedding-key'
    })

    afterEach(() => {
        if (originalEmbedKey === undefined) delete process.env.RERUN_EMBED_API_KEY
        else process.env.RERUN_EMBED_API_KEY = originalEmbedKey
        if (originalOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY
        else process.env.OPENROUTER_API_KEY = originalOpenRouterKey
    })

    it('uses the dedicated embedding key when the Rerun key is also configured', async () => {
        await expect(embedText('hello')).resolves.toEqual([0.1, 0.2])

        expect(createOpenAICompatible).toHaveBeenCalledWith({
            name: 'openrouter',
            apiKey: 'embedding-key',
            baseURL: 'https://openrouter.ai/api/v1',
        })
    })

    it('does not fall back to the Rerun key', async () => {
        delete process.env.RERUN_EMBED_API_KEY

        await expect(embedText('hello')).resolves.toBeNull()
        expect(createOpenAICompatible).not.toHaveBeenCalled()
    })

    // The model refuses past 8192 tokens: a long memory used to come back as a 500 and no vector.
    it('embeds only the head of a text too long for the model', async () => {
        await embedText('a'.repeat(40_000))

        const value = (vi.mocked(embed).mock.calls[0]?.[0] as { value: string }).value
        expect(value.length).toBe(24_000)
    })
})
