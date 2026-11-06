import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { EMAIL_PREVIEWS, NEWSLETTERS, renderEmail, TONES, theme } from '@rerun/emails'

// The email design system only holds if the templates keep going through it. These three checks
// are what stop the old habits from creeping back: per-file colour constants, flexbox that no
// mail client runs, and alpha colours the Word engine drops on the floor.

// Structural colours that are not design tokens: the light edge on the button relief, and the
// transparent keyword.
const STRUCTURAL_COLOURS = new Set(['#ffffff'])

function allowedColours(): Set<string> {
    const values = [
        ...Object.values(theme.surface),
        ...Object.values(theme.text),
        ...Object.values(theme.brand),
        ...Object.values(TONES).flatMap(tone => Object.values(tone)),
        ...STRUCTURAL_COLOURS,
    ]
    return new Set(values.map(value => value.toLowerCase()))
}

// Newsletters go through the same checks: they are written by hand, one file per issue, and
// nothing else would stop a pasted hex from landing in one.
const NEWSLETTER_PREVIEW_PROPS = {
    appUrl: 'https://app.rerun.build',
    unsubscribeUrl: 'https://app.rerun.build/unsubscribe?token=test',
}

async function renderAll() {
    const elements = [
        ...EMAIL_PREVIEWS.map(preview => ({ id: preview.id, element: preview.element })),
        ...NEWSLETTERS.map(newsletter => ({
            id: `newsletter/${newsletter.slug}`,
            element: newsletter.render(NEWSLETTER_PREVIEW_PROPS),
        })),
    ]
    return Promise.all(elements.map(async entry => ({ id: entry.id, ...(await renderEmail(entry.element)) })))
}

describe('email templates', () => {
    it('has at least one preview per template', () => {
        const templates = readdirSync(path.resolve(import.meta.dirname, '../../../../packages/emails/emails')).filter(file => file.endsWith('.tsx'))
        const groups = new Set(EMAIL_PREVIEWS.map(p => p.group))
        expect(groups.size).toBe(templates.length)
    })

    it('renders every preview to HTML and to text', async () => {
        for (const rendered of await renderAll()) {
            expect(rendered.html, rendered.id).toContain('<html')
            expect(rendered.text.trim(), rendered.id).not.toBe('')
        }
    })

    it('never links to the settings page, which the app does not have', async () => {
        for (const { id, html } of await renderAll()) {
            expect(html, id).not.toContain('/settings"')
        }
    })

    it('shows no unsubscribe link on an email that has none to offer', async () => {
        const rendered = await renderAll()
        for (const id of ['sign-in-code/default', 'workspace-invite/anonymous', 'trial-final-notice/no-card', 'renewal-reminder/seven-days']) {
            const email = rendered.find(entry => entry.id === id)
            expect(email?.html, id).not.toContain('Unsubscribe')
        }
    })

    it('never lays out with flexbox', async () => {
        for (const { id, html } of await renderAll()) {
            expect(html.replace(/\s/g, ''), id).not.toContain('display:flex')
        }
    })

    it('never paints with alpha colours', async () => {
        for (const { id, html } of await renderAll()) {
            const alphaPaint = html.match(/(?:^|[;"\s])(?:color|background(?:-color)?|border(?:-[a-z]+)?-color):[^;"]*rgba\(/gi)
            expect(alphaPaint, id).toBeNull()
        }
    })

    it('only uses colours declared in the theme', async () => {
        const allowed = allowedColours()
        for (const { id, html } of await renderAll()) {
            // The lookbehind skips numeric HTML entities (&#8203;), which are not colours.
            const strays = [...new Set(html.match(/(?<!&)#[0-9a-f]{3,8}\b/gi) ?? [])]
                .map(hex => hex.toLowerCase())
                .filter(hex => !allowed.has(hex))
            expect(strays, `${id} uses colours that are not theme tokens`).toEqual([])
        }
    })
})
