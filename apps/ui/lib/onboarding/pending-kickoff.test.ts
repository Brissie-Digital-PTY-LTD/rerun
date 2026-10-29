import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPendingKickoff, readPendingKickoff, savePendingKickoff } from './pending-kickoff'

const KEY = 'rerun:pending-kickoff'

function memoryStorage() {
    const values = new Map<string, string>()
    return {
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => void values.set(key, value)),
        removeItem: vi.fn((key: string) => void values.delete(key)),
    }
}

let storage: ReturnType<typeof memoryStorage>

beforeEach(() => {
    storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('pending kickoff', () => {
    it('round-trips a parked entry until it is cleared', () => {
        savePendingKickoff({ agentId: 'a1', kickoff: 'Brief' })
        expect(readPendingKickoff()).toEqual({ agentId: 'a1', kickoff: 'Brief' })
        clearPendingKickoff()
        expect(readPendingKickoff()).toBeNull()
    })

    it('refuses to park an entry without an agent', () => {
        savePendingKickoff({ agentId: '' })
        expect(storage.setItem).not.toHaveBeenCalled()
    })

    it('purges an entry that no longer matches the shape', () => {
        storage.setItem(KEY, JSON.stringify({ kickoff: 'orphan' }))
        expect(readPendingKickoff()).toBeNull()
        expect(storage.removeItem).toHaveBeenCalledWith(KEY)
    })

    it('reads unparsable JSON as nothing', () => {
        storage.setItem(KEY, '{broken')
        expect(readPendingKickoff()).toBeNull()
    })

    it('does nothing when there is no storage at all, as during SSR', () => {
        vi.stubGlobal('localStorage', undefined)
        expect(() => savePendingKickoff({ agentId: 'a1' })).not.toThrow()
        expect(readPendingKickoff()).toBeNull()
        expect(() => clearPendingKickoff()).not.toThrow()
    })
})
