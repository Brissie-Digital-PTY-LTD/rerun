import type { streamText } from 'ai'
import type { Provider } from '@rerun/contracts'

type ProviderOptions = NonNullable<Parameters<typeof streamText>[0]['providerOptions']>

// Every provider that can show its work is asked to show it, and the model decides when there is
// anything to show: `adaptive` on Anthropic, and on the others a summary of reasoning the model
// already produces and already bills for. `claude` and `codex` drive their CLI through
// `defaultSettings` instead, and `rerun` / `openrouter` ask for it in the request body
// (see openrouter-reasoning.ts) because the OpenAI chat wire format has no field for it.
const REASONING_OPTIONS: Partial<Record<Provider, ProviderOptions>> = {
    anthropic: { anthropic: { thinking: { type: 'adaptive', display: 'summarized' } } },
    openai: { openai: { reasoningSummary: 'auto' } },
    google: { google: { thinkingConfig: { includeThoughts: true } } },
}

export function reasoningProviderOptions(provider: Provider): ProviderOptions | undefined {
    return REASONING_OPTIONS[provider]
}

// One level deep on purpose: `openai` already carries the `promptCacheKey` that applyCaching put
// there, and a plain spread of the two objects would drop it.
export function mergeProviderOptions(base: ProviderOptions | undefined, extra: ProviderOptions | undefined): ProviderOptions | undefined {
    if (!base) return extra
    if (!extra) return base
    const merged: ProviderOptions = { ...base }
    for (const [provider, options] of Object.entries(extra)) {
        merged[provider] = { ...merged[provider], ...options }
    }
    return merged
}
