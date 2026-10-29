'use client'

import { detectInAppBrowser } from '@/lib/in-app-browser'
import { useCallback, useEffect, useRef, useState } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const FAILED = 'We could not confirm you are not a robot. Try again.'
// An app's built-in browser can leave Cloudflare silent on every try, and it holds none of the
// visitor's sessions: their own browser is where both work.
const FAILED_IN_APP = 'Open this link in your browser to sign in.'
// Cloudflare answers in a second or two when it draws nothing. A visitor whose network never lets
// it answer would otherwise wait on a spinning button forever.
const SILENT_CHECK_TIMEOUT_MS = 20_000

export class CaptchaError extends Error {
    constructor(readonly reason: 'captcha_failed' | 'captcha_timeout') {
        super(detectInAppBrowser(navigator.userAgent) ? FAILED_IN_APP : FAILED)
    }
}

type TurnstileOptions = {
    sitekey: string
    execution: 'execute'
    appearance: 'interaction-only'
    callback: (token: string) => void
    'error-callback': () => void
    'timeout-callback': () => void
    'unsupported-callback': () => void
    'before-interactive-callback': () => void
    'after-interactive-callback': () => void
}

type TurnstileApi = {
    render: (container: HTMLElement, options: TurnstileOptions) => string
    execute: (widgetId: string) => void
    reset: (widgetId: string) => void
    remove: (widgetId: string) => void
}

type Widget = { api: TurnstileApi; id: string }
type Waiter = { resolve: (token: string) => void; reject: (error: CaptchaError) => void }

declare global {
    interface Window {
        turnstile?: TurnstileApi
    }
}

let loading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
    loading ??= new Promise<TurnstileApi>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = SCRIPT_URL
        script.async = true
        script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new CaptchaError('captcha_failed')))
        script.onerror = () => {
            // A later attempt gets a fresh load instead of this failure forever.
            loading = null
            script.remove()
            reject(new CaptchaError('captcha_failed'))
        }
        document.head.appendChild(script)
    })
    return loading
}

// Cloudflare's check that a visitor is not a script. The widget draws nothing unless Cloudflare
// wants the visitor to tick a box, and a token is spent by the request that carries it, so every
// send asks for a new one. Without a site key, as on a local stack, there is no check at all.
export function useTurnstile() {
    const containerRef = useRef<HTMLDivElement>(null)
    const widget = useRef<Promise<Widget | null> | null>(null)
    const waiter = useRef<Waiter | null>(null)
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [challenging, setChallenging] = useState(false)

    const stopTimeout = useCallback(() => {
        if (timeout.current) clearTimeout(timeout.current)
        timeout.current = null
    }, [])

    const settle = useCallback(
        (token: string | null, reason: CaptchaError['reason'] = 'captcha_failed') => {
            stopTimeout()
            if (token) waiter.current?.resolve(token)
            else waiter.current?.reject(new CaptchaError(reason))
            waiter.current = null
        },
        [stopTimeout]
    )

    // Only a check that draws nothing is timed: a visitor ticking the box takes the time they need.
    const startTimeout = useCallback(() => {
        stopTimeout()
        timeout.current = setTimeout(() => settle(null, 'captcha_timeout'), SILENT_CHECK_TIMEOUT_MS)
    }, [settle, stopTimeout])

    useEffect(() => {
        const container = containerRef.current
        if (!SITE_KEY || !container) return
        let unmounted = false

        const mounted = loadTurnstile().then(
            api => {
                if (unmounted) return null
                const id = api.render(container, {
                    sitekey: SITE_KEY,
                    execution: 'execute',
                    appearance: 'interaction-only',
                    callback: settle,
                    'error-callback': () => settle(null),
                    'timeout-callback': () => settle(null, 'captcha_timeout'),
                    'unsupported-callback': () => settle(null),
                    'before-interactive-callback': () => {
                        stopTimeout()
                        setChallenging(true)
                    },
                    'after-interactive-callback': () => setChallenging(false),
                })
                return { api, id }
            },
            () => null
        )
        widget.current = mounted

        return () => {
            unmounted = true
            settle(null)
            void mounted.then(rendered => rendered?.api.remove(rendered.id))
        }
    }, [settle, stopTimeout])

    // The timer starts before the script has loaded: a network that never delivers it is the same
    // dead end as a check that never answers.
    const getToken = useCallback(async (): Promise<string | undefined> => {
        if (!SITE_KEY) return undefined
        waiter.current?.reject(new CaptchaError('captcha_failed'))
        return new Promise<string>((resolve, reject) => {
            waiter.current = { resolve, reject }
            startTimeout()
            void (widget.current ?? Promise.resolve(null)).then(rendered => {
                if (!rendered) return settle(null)
                rendered.api.reset(rendered.id)
                rendered.api.execute(rendered.id)
            })
        })
    }, [settle, startTimeout])

    return { containerRef, challenging, getToken }
}
