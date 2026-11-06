import { readableToolError } from '@rerun/contracts'
import { describe, expect, it } from 'vitest'

describe('readableToolError', () => {
    it('reads a tool name Claude got wrong as a tool not found', () => {
        expect(readableToolError('<tool_use_error>Error: No such tool available: memory_recall</tool_use_error>')).toBe('Tool not found')
    })

    it('reads a tool name a model got wrong in the Rerun loop as a tool not found, without the list of every tool', () => {
        expect(readableToolError("Model tried to call unavailable tool 'mcp__rerun__schedule_list'. Available tools: fs_read, fs_write, schedule_list.")).toBe('Tool not found')
    })

    it('drops the CLI tag around any other error and keeps its words', () => {
        expect(readableToolError('<tool_use_error>InputValidationError: path is required</tool_use_error>')).toBe('InputValidationError: path is required')
    })

    it('leaves a plain error as it is', () => {
        expect(readableToolError('Request timed out after 5000ms')).toBe('Request timed out after 5000ms')
    })
})
