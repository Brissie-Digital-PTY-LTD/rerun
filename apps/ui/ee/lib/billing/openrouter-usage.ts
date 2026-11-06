// OpenRouter reports what a call really cost, but only if asked, and only in the last frame of the
// stream. Both Rerun callers need that number: the proxy the boxes speak to
// (app/api/llm/chat/completions) and the foreman, which runs its own streamText on the hub.
// So the asking and the reading live here, as a fetch wrapper the caller hands to its provider.
//
// A call served on our own provider key (BYOK) is charged twice: `cost` is then only OpenRouter's
// fee, and what the provider billed comes apart in `cost_details.upstream_inference_cost`, which is
// 0 or null on every other call. The cost handed to the caller is the sum, so it is what we pay
// whichever way the call was routed.

export type OpenRouterUsage = { prompt_tokens?: number; completion_tokens?: number; cost?: number; cost_details?: { upstream_inference_cost?: number | null } | null }

export function readUsage(value: unknown): OpenRouterUsage | null {
    if (!value || typeof value !== 'object') return null
    const usage = (value as { usage?: unknown }).usage
    if (!usage || typeof usage !== 'object') return null
    const u = usage as OpenRouterUsage
    if (typeof u.cost !== 'number') return null
    const upstream = u.cost_details?.upstream_inference_cost
    return typeof upstream === 'number' ? { ...u, cost: u.cost + upstream } : u
}

function withUsageAsked(body: BodyInit | null | undefined): BodyInit | null | undefined {
    if (typeof body !== 'string') return body
    try {
        const parsed = JSON.parse(body) as Record<string, unknown>
        return JSON.stringify({ ...parsed, usage: { include: true } })
    } catch {
        return body
    }
}

// `fetch` already undid the upstream compression, so an answer rebuilt from its text must not
// announce it any more: the caller would try to gunzip plain JSON, and trust a length that was the
// compressed one.
function decodedHeaders(headers: Headers): Headers {
    const decoded = new Headers(headers)
    decoded.delete('content-encoding')
    decoded.delete('content-length')
    return decoded
}

// Passes the response through untouched and calls `onUsage` once, when the stream ends. A
// non-streaming answer is read in one go; anything that is not JSON is left alone.
export function meteredFetch(onUsage: (usage: OpenRouterUsage) => void): typeof globalThis.fetch {
    return async (input, init) => {
        const upstream = await fetch(input as RequestInfo, init ? { ...init, body: withUsageAsked(init.body) } : init)

        const contentType = upstream.headers.get('content-type') ?? ''
        if (!upstream.ok || !upstream.body) return upstream

        if (!contentType.includes('text/event-stream')) {
            const text = await upstream.text()
            try {
                const usage = readUsage(JSON.parse(text))
                if (usage) onUsage(usage)
            } catch {}
            return new Response(text, { status: upstream.status, headers: decodedHeaders(upstream.headers) })
        }

        let pending = ''
        let captured: OpenRouterUsage | null = null
        const decoder = new TextDecoder()

        const tee = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
                controller.enqueue(chunk)
                pending += decoder.decode(chunk, { stream: true })
                const lines = pending.split('\n')
                pending = lines.pop() ?? ''
                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed.startsWith('data:')) continue
                    const payload = trimmed.slice(5).trim()
                    if (!payload || payload === '[DONE]') continue
                    try {
                        const usage = readUsage(JSON.parse(payload))
                        if (usage) captured = usage
                    } catch {}
                }
            },
            flush() {
                if (captured) onUsage(captured)
            },
        })

        return new Response(upstream.body.pipeThrough(tee), { status: upstream.status, headers: upstream.headers })
    }
}
