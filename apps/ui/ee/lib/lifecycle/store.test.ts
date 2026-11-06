import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase, type SupabaseCall } from '@/test/supabase-fake'
import { loadSentIndex, recordLifecycleEmail, sendsFor, type SentIndex } from './store'

function row(overrides: Record<string, unknown>) {
    return { user_id: 'user-1', workspace_id: 1, agent_id: null, sequence_key: 'trial_ended', sent_at: '2026-09-20T10:00:00.000Z', ...overrides }
}

function filteredOn(calls: readonly SupabaseCall[], column: string) {
    return calls.some(call => call.method === 'in' && call.args[0] === column)
}

describe('loadSentIndex', () => {
    it('reads nothing for no users', async () => {
        const db = fakeSupabase()

        const index = await loadSentIndex(db.client, [], [1])

        expect(index.byUser.size).toBe(0)
        expect(db.calls).toEqual([])
    })

    it('indexes the sends by recipient and by workspace', async () => {
        const db = fakeSupabase((_table, calls) =>
            filteredOn(calls, 'user_id') ? { data: [row({ sequence_key: 'onboarding_resume' })] } : { data: [row({ user_id: 'user-2', sequence_key: 'trial_ended' })] },
        )

        const index = await loadSentIndex(db.client, ['user-1'], [1])

        expect(index.byUser.get('user-1')).toEqual([{ sequenceKey: 'onboarding_resume', agentId: null, sentAt: new Date('2026-09-20T10:00:00.000Z'), recipientId: 'user-1' }])
        expect(index.byWorkspace.get(1)?.map(send => send.recipientId)).toEqual(['user-2'])
    })

    it('skips the workspace read when there is no workspace', async () => {
        const db = fakeSupabase(() => ({ data: [] }))

        await loadSentIndex(db.client, ['user-1'], [])

        expect(db.chainsOn('lifecycle_emails')).toHaveLength(1)
    })

    it('reads every send past the 1000 rows one PostgREST response holds', async () => {
        const sends = Array.from({ length: 1500 }, (_, i) => row({ sent_at: new Date(Date.UTC(2026, 8, 20) - i * 60_000).toISOString() }))
        const db = fakeSupabase((_table, calls) => {
            if (!filteredOn(calls, 'user_id')) return { data: [] }
            const [from, to] = calls.find(call => call.method === 'range')?.args as [number, number]
            return { data: sends.slice(from, Math.min(to + 1, from + 1000)) }
        })

        const index = await loadSentIndex(db.client, ['user-1'], [1])

        expect(index.byUser.get('user-1')).toHaveLength(1500)
    })
})

describe('sendsFor', () => {
    it('counts a workspace send by the same recipient once', () => {
        const own = { sequenceKey: 'trial_ended' as const, agentId: null, sentAt: new Date(), recipientId: 'user-1' }
        const colleague = { ...own, sequenceKey: 'team_invite' as const, recipientId: 'user-2' }
        const index: SentIndex = { byUser: new Map([['user-1', [own]]]), byWorkspace: new Map([[1, [own, colleague]]]) }

        expect(sendsFor(index, 'user-1', 1)).toEqual([own, colleague])
    })

    it('is empty for someone with no history', () => {
        expect(sendsFor({ byUser: new Map(), byWorkspace: new Map() }, 'user-1', 1)).toEqual([])
    })
})

describe('recordLifecycleEmail', () => {
    const candidate = { sequenceKey: 'trial_ended' as const, userId: 'user-1', workspaceId: 1, agentId: null }

    beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))

    it('inserts the row with its status and metadata', async () => {
        const db = fakeSupabase()

        await expect(recordLifecycleEmail(db.client, candidate, 'sent', { emailId: 'email_1' })).resolves.toBe('recorded')
        expect(db.writes('lifecycle_emails')[0].payload).toEqual({ user_id: 'user-1', workspace_id: 1, sequence_key: 'trial_ended', agent_id: null, status: 'sent', metadata: { emailId: 'email_1' } })
    })

    it('reads a unique violation as a duplicate', async () => {
        const db = fakeSupabase(() => ({ error: { code: '23505', message: 'duplicate key' } }))

        await expect(recordLifecycleEmail(db.client, candidate, 'sent')).resolves.toBe('duplicate')
    })

    it('reads any other error as a failure', async () => {
        const db = fakeSupabase(() => ({ error: { code: '42501', message: 'permission denied' } }))

        await expect(recordLifecycleEmail(db.client, candidate, 'sent')).resolves.toBe('failed')
    })
})
