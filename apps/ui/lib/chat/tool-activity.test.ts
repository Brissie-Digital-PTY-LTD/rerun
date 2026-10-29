import { toolActivityOf } from '@rerun/contracts'
import { describe, expect, it } from 'vitest'

describe('toolActivityOf', () => {
    it('reads a known tool as what the coworker is doing', () => {
        expect(toolActivityOf('web_search')).toBe('Searching the web')
        expect(toolActivityOf('fs_read', { path: 'notes.md' })).toBe('Reading a file')
    })

    it('leaves an unknown tool to the caller', () => {
        expect(toolActivityOf('gmail_search_threads')).toBeUndefined()
        expect(toolActivityOf('paid_data', { capability: 'nope' })).toBeUndefined()
    })
})
