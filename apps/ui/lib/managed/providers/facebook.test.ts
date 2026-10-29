import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildManagedAuthorizeUrl } from '../oauth'
import { getTool } from '../types'
import { facebookProvider } from './facebook'

type Call = { url: URL; method: string; auth: string | null; body: URLSearchParams }

function stubGraph(answer: (call: Call) => unknown): Call[] {
    const calls: Call[] = []
    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string, init: RequestInit) => {
            const call = { url: new URL(input), method: init.method ?? 'GET', auth: new Headers(init.headers).get('authorization'), body: new URLSearchParams((init.body as string) ?? '') }
            calls.push(call)
            const payload = answer(call)
            const status = payload && typeof payload === 'object' && 'error' in payload ? 400 : 200
            return new Response(JSON.stringify(payload), { status })
        })
    )
    return calls
}

function pageTokenOr(call: Call, payload: unknown): unknown {
    return call.url.searchParams.get('fields') === 'access_token' ? { id: 'p1', access_token: 'page-token' } : payload
}

function tool(name: string) {
    const found = getTool(facebookProvider, name)
    if (!found) throw new Error(`no tool ${name}`)
    return found
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('facebook provider oauth', () => {
    it('asks Facebook Login for Business for its configuration instead of scopes', () => {
        const ctx = { verifier: 'v', agentId: 'a', key: 'facebook', provider: 'facebook', serverName: 'facebook', redirectUri: 'https://app.rerun.build/api/oauth/managed/facebook/callback' }
        const url = new URL(buildManagedAuthorizeUrl(facebookProvider.oauth, 'app-id', ctx, 'chal', 'st'))
        expect(url.hostname).toBe('www.facebook.com')
        expect(url.searchParams.has('scope')).toBe(false)
        expect(url.searchParams.get('config_id')).toBeTruthy()
        expect(url.searchParams.get('response_type')).toBe('code')
    })

    it('labels the connection with the shared Pages', async () => {
        stubGraph(() => ({ data: [{ name: 'Rerun AI' }, { name: 'Atelier Nord' }] }))
        await expect(facebookProvider.oauth.accountEmail?.('business-token')).resolves.toBe('Rerun AI, Atelier Nord')
    })
})

describe('facebook tools', () => {
    it('exposes no Messenger tool, since pages_messaging is not granted', () => {
        expect(facebookProvider.tools.some(t => /message|conversation/i.test(t.name))).toBe(false)
    })

    it('calls Page endpoints with the Page token read back from the business token', async () => {
        const calls = stubGraph(call => pageTokenOr(call, { data: [] }))
        await tool('facebook_list_posts').execute({ pageId: 'p1', limit: 500 }, 'business-token')
        expect(calls[0].auth).toBe('Bearer business-token')
        expect(calls[0].url.pathname.endsWith('/p1')).toBe(true)
        expect(calls[1].auth).toBe('Bearer page-token')
        expect(calls[1].url.pathname.endsWith('/p1/posts')).toBe(true)
        expect(calls[1].url.searchParams.get('limit')).toBe('100')
    })

    it('tells the coworker to list the Pages when one was not shared', async () => {
        stubGraph(() => ({ id: 'p9' }))
        await expect(tool('facebook_get_page').execute({ pageId: 'p9' }, 'business-token')).rejects.toThrow('facebook_list_pages')
    })

    it('surfaces the Graph error message and code', async () => {
        stubGraph(call => pageTokenOr(call, { error: { message: 'Invalid parameter', code: 100 } }))
        await expect(tool('facebook_create_post').execute({ pageId: 'p1', message: 'hi' }, 't')).rejects.toThrow('Facebook API 400 (code 100): Invalid parameter')
    })

    it('schedules instead of publishing when scheduledAt is given', async () => {
        const calls = stubGraph(call => pageTokenOr(call, { id: 'p1_42' }))
        await tool('facebook_create_post').execute({ pageId: 'p1', message: 'Launch', scheduledAt: '2026-11-02T09:00:00Z' }, 't')
        const post = calls[1]
        expect(post.method).toBe('POST')
        expect(post.body.get('message')).toBe('Launch')
        expect(post.body.get('published')).toBe('false')
        expect(post.body.get('scheduled_publish_time')).toBe(String(Date.parse('2026-11-02T09:00:00Z') / 1000))
    })

    it('rejects a schedule it cannot read', async () => {
        stubGraph(call => pageTokenOr(call, {}))
        await expect(tool('facebook_create_post').execute({ pageId: 'p1', message: 'x', scheduledAt: 'next week' }, 't')).rejects.toThrow('scheduledAt must be')
    })

    it('uploads each photo unpublished, then attaches them to one post', async () => {
        let photo = 0
        const calls = stubGraph(call => pageTokenOr(call, call.url.pathname.endsWith('/photos') ? { id: `ph${++photo}` } : { id: 'p1_7' }))
        await tool('facebook_create_multi_photo_post').execute({ pageId: 'p1', imageUrls: ['https://x/a.jpg', 'https://x/b.jpg'], message: 'Two' }, 't')
        const uploads = calls.filter(c => c.url.pathname.endsWith('/photos'))
        expect(uploads.map(c => c.body.get('published'))).toEqual(['false', 'false'])
        const feed = calls.find(c => c.url.pathname.endsWith('/feed'))
        expect(feed?.body.get('attached_media[0]')).toBe('{"media_fbid":"ph1"}')
        expect(feed?.body.get('attached_media[1]')).toBe('{"media_fbid":"ph2"}')
    })

    it('refuses a multi-photo post with a single photo', async () => {
        await expect(tool('facebook_create_multi_photo_post').execute({ pageId: 'p1', imageUrls: ['https://x/a.jpg'] }, 't')).rejects.toThrow('between 2 and 10')
    })

    it('hides a comment by default', async () => {
        const calls = stubGraph(call => pageTokenOr(call, { success: true }))
        await tool('facebook_hide_comment').execute({ pageId: 'p1', commentId: 'c1' }, 't')
        expect(calls[1].url.pathname.endsWith('/c1')).toBe(true)
        expect(calls[1].body.get('is_hidden')).toBe('true')
    })

    it('updates only the Page fields it is given', async () => {
        const calls = stubGraph(call => pageTokenOr(call, { success: true }))
        await tool('facebook_update_page').execute({ pageId: 'p1', about: 'Bakery in Lyon', emails: ['hi@x.fr'] }, 't')
        expect(calls[1].method).toBe('POST')
        expect(calls[1].url.pathname.endsWith('/p1')).toBe(true)
        expect(calls[1].body.get('about')).toBe('Bakery in Lyon')
        expect(calls[1].body.get('emails')).toBe('["hi@x.fr"]')
        expect(calls[1].body.has('website')).toBe(false)
    })

    it('refuses a Page update with nothing to change', async () => {
        stubGraph(call => pageTokenOr(call, {}))
        await expect(tool('facebook_update_page').execute({ pageId: 'p1' }, 't')).rejects.toThrow('at least one field')
    })

    it('adds each photo to the album', async () => {
        let photo = 0
        const calls = stubGraph(call => pageTokenOr(call, call.url.pathname.endsWith('/photos') ? { id: `ph${++photo}` } : {}))
        const result = await tool('facebook_add_photos_to_album').execute({ pageId: 'p1', albumId: 'al1', imageUrls: ['https://x/a.jpg', 'https://x/b.jpg'], caption: 'Spring' }, 't')
        const uploads = calls.filter(c => c.url.pathname.endsWith('/al1/photos'))
        expect(uploads.map(c => c.body.get('url'))).toEqual(['https://x/a.jpg', 'https://x/b.jpg'])
        expect(uploads[0].body.get('caption')).toBe('Spring')
        expect(result).toEqual({ albumId: 'al1', photoIds: ['ph1', 'ph2'] })
    })

    it('lists business users and other people with access to the Page', async () => {
        const calls = stubGraph(call => pageTokenOr(call, call.url.searchParams.get('fields') === 'business' ? { business: { id: 'b1', name: 'Acme' } } : { data: [{ id: call.url.pathname.endsWith('/assigned_users') ? 'bu1' : 'u1', tasks: ['MODERATE'] }] }))
        await expect(tool('facebook_list_page_people').execute({ pageId: 'p1' }, 't')).resolves.toEqual({
            business: { id: 'b1', name: 'Acme' },
            businessUsers: [{ id: 'bu1', tasks: ['MODERATE'] }],
            otherPeople: [{ id: 'u1', tasks: ['MODERATE'] }],
        })
        expect(calls.find(c => c.url.pathname.endsWith('/assigned_users'))?.url.searchParams.get('business')).toBe('b1')
    })

    it('still lists the business users when the roles edge is refused', async () => {
        stubGraph(call => {
            if (call.url.searchParams.get('fields') === 'business') return pageTokenOr(call, { business: { id: 'b1' } })
            if (call.url.pathname.endsWith('/roles')) return { error: { message: 'Unsupported get request', code: 100 } }
            return pageTokenOr(call, { data: [{ id: 'bu1', tasks: ['MANAGE'] }] })
        })
        await expect(tool('facebook_list_page_people').execute({ pageId: 'p1' }, 't')).resolves.toMatchObject({ businessUsers: [{ id: 'bu1' }], otherPeople: [] })
    })

    it('explains that a Page without a business portfolio has no business users', async () => {
        stubGraph(call => pageTokenOr(call, { id: 'p1' }))
        await expect(tool('facebook_list_page_people').execute({ pageId: 'p1' }, 't')).rejects.toThrow('not owned by a business portfolio')
    })

    it('assigns Page tasks as a JSON list', async () => {
        const calls = stubGraph(call => pageTokenOr(call, { success: true }))
        await tool('facebook_assign_page_tasks').execute({ pageId: 'p1', userId: 'bu1', tasks: ['CREATE_CONTENT', 'MODERATE'] }, 't')
        expect(calls[1].url.pathname.endsWith('/p1/assigned_users')).toBe(true)
        expect(calls[1].body.get('user')).toBe('bu1')
        expect(calls[1].body.get('tasks')).toBe('["CREATE_CONTENT","MODERATE"]')
    })

    it('removes Page access by user id', async () => {
        const calls = stubGraph(call => pageTokenOr(call, { success: true }))
        await tool('facebook_remove_page_access').execute({ pageId: 'p1', userId: 'bu1' }, 't')
        expect(calls[1].method).toBe('DELETE')
        expect(calls[1].url.searchParams.get('user')).toBe('bu1')
    })

    it('uploads videos through the video host', async () => {
        const calls = stubGraph(call => pageTokenOr(call, { id: 'v1' }))
        await tool('facebook_create_video_post').execute({ pageId: 'p1', videoUrl: 'https://x/v.mp4' }, 't')
        expect(calls[1].url.hostname).toBe('graph-video.facebook.com')
        expect(calls[1].body.get('file_url')).toBe('https://x/v.mp4')
    })
})
