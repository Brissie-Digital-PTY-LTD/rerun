import { describe, expect, it } from 'vitest'
import { coworkerAccessSummary } from './access-summary'

const base = { boxName: 'Marketing', grantCount: 0 }

describe('coworkerAccessSummary', () => {
    it('reads the same open Box for everyone, a member also hears their own level', () => {
        expect(coworkerAccessSummary({ ...base, isAdmin: true, visibility: 'workspace', access: 'manage' })).toEqual({ title: 'Everyone in the workspace', detail: 'via Box Marketing' })
        expect(coworkerAccessSummary({ ...base, isAdmin: false, visibility: null, access: 'use' })).toEqual({ title: 'Everyone in the workspace', detail: 'You can use this coworker, via Box Marketing' })
    })

    it('counts the people of a restricted Box for an admin only', () => {
        expect(coworkerAccessSummary({ ...base, isAdmin: true, visibility: 'restricted', access: 'manage', grantCount: 3 }).title).toBe('3 people, via Box Marketing')
        expect(coworkerAccessSummary({ ...base, isAdmin: true, visibility: 'restricted', access: 'manage', grantCount: 1 }).title).toBe('1 person, via Box Marketing')
        expect(coworkerAccessSummary({ ...base, isAdmin: true, visibility: 'restricted', access: 'manage' }).title).toBe('Admins only')
    })

    it('shows a member of a restricted Box their own level, never the count', () => {
        expect(coworkerAccessSummary({ ...base, isAdmin: false, visibility: 'restricted', access: 'use', grantCount: 5 })).toEqual({ title: 'You can use this coworker', detail: 'via Box Marketing' })
        expect(coworkerAccessSummary({ ...base, isAdmin: false, visibility: 'restricted', access: 'manage', grantCount: 5 }).title).toBe('You manage this coworker')
    })
})
