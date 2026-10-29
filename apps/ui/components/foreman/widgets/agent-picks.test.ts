import { describe, expect, it } from 'vitest'

import { readAgentPicks } from './agent-picks'

describe('readAgentPicks', () => {
    it('reads a row with the tab and the conversation it leads to', () => {
        expect(readAgentPicks({ agents: [{ agentId: 'a1', tab: 'chat', conversationId: 'c1', runId: 'r1' }] })).toEqual([{ agentId: 'a1', tab: 'chat', conversationId: 'c1', runId: 'r1' }])
    })

    it('takes a tab under the name the user reads', () => {
        expect(readAgentPicks({ agents: [{ agentId: 'a1', tab: 'Apps' }] })[0].tab).toBe('services')
    })

    it('keeps the row of a tab the panel does not have, without a tab', () => {
        expect(readAgentPicks({ agents: [{ agentId: 'a1', tab: 'nowhere' }] })).toEqual([{ agentId: 'a1', tab: null, conversationId: null, runId: null }])
    })

    it('drops what is still being written', () => {
        expect(readAgentPicks(undefined)).toEqual([])
        expect(readAgentPicks({ agents: 'a1' })).toEqual([])
        expect(readAgentPicks({ agents: [{ agentId: 'a1' }, {}, null, { agentId: '' }] }).map(pick => pick.agentId)).toEqual(['a1'])
    })
})
