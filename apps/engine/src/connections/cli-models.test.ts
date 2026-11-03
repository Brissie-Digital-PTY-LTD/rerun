import { cliServesModel } from '@rerun/contracts'
import { describe, expect, it } from 'vitest'
import { forgetCliModels, readCliModels, recordCliModels } from './cli-models.js'

describe('cli models', () => {
    it('keeps no reading of an empty answer, so nothing gets locked by a probe that saw nothing', () => {
        recordCliModels('c1', [], '0.166.0', false)
        expect(readCliModels('c1')).toBeNull()
    })

    it('holds one reading per connection until it is forgotten', () => {
        recordCliModels('c1', ['opus', 'claude-opus-5-5', 'claude-opus-5-5'], '2.1.317', false)
        expect(readCliModels('c1')).toMatchObject({ models: ['opus', 'claude-opus-5-5'], version: '2.1.317', outdated: false })
        forgetCliModels('c1')
        expect(readCliModels('c1')).toBeNull()
    })
})

describe('cliServesModel', () => {
    const reading = { models: ['claude-opus-4-8', 'claude-sonnet-5-5'], version: '2.1.317', outdated: false, capturedAt: '2026-11-03T00:00:00.000Z' }

    it('serves everything without a reading', () => {
        expect(cliServesModel('codex', null, 'gpt-6.1-terra')).toBe(true)
    })

    it('serves a listed model and its 1M-context variant, nothing else', () => {
        expect(cliServesModel('codex', reading, 'claude-sonnet-5-5')).toBe(true)
        expect(cliServesModel('codex', reading, 'claude-opus-4-8[1m]')).toBe(true)
        expect(cliServesModel('codex', reading, 'claude-haiku-5-5')).toBe(false)
    })

    it('refuses nothing on a Claude reading, which names the picker rather than the account', () => {
        expect(cliServesModel('claude', reading, 'claude-haiku-5-5')).toBe(true)
    })
})
