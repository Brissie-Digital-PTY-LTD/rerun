import { InvalidToolInputError, NoSuchToolError } from 'ai'
import { describe, expect, it } from 'vitest'
import { repairToolCall } from './tool-repair.js'

const toolCall = { type: 'tool-call' as const, toolCallId: 'call-1', toolName: 'fs_read', input: JSON.stringify({ path: 'notes.md', encoding: null }) }

async function repair(error: unknown, input = toolCall.input) {
    return repairToolCall({ toolCall: { ...toolCall, input }, error, tools: {}, inputSchema: () => ({}), messages: [], system: undefined } as any)
}

describe('repairToolCall', () => {
    it('rewrites the input of a call rejected for its nulls, keeping the rest of the call', async () => {
        const error = new InvalidToolInputError({ toolName: 'fs_read', toolInput: toolCall.input, cause: new Error('Expected string, received null') })
        expect(await repair(error)).toEqual({ ...toolCall, input: JSON.stringify({ path: 'notes.md' }) })
    })

    it('gives up on an invalid input that has no null to strip', async () => {
        const input = JSON.stringify({ path: 42 })
        const error = new InvalidToolInputError({ toolName: 'fs_read', toolInput: input, cause: new Error('Expected string') })
        expect(await repair(error, input)).toBeNull()
    })

    it('leaves a call to an unknown tool alone', async () => {
        expect(await repair(new NoSuchToolError({ toolName: 'fs_read' }))).toBeNull()
    })
})
