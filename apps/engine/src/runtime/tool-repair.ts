import { InvalidToolInputError, type ToolCallRepairFunction, type ToolSet } from 'ai'

// Many OpenAI-compatible models serialise an omitted optional field as an explicit `null`, which
// every `.optional()` schema rejects. Dropping those keys turns the rejected call into the call the
// model meant to make, without a repair round-trip to the model.
function stripNullProperties(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stripNullProperties)
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, item]) => item !== null)
                .map(([key, item]) => [key, stripNullProperties(item)]),
        )
    }
    return value
}

export function repairNullToolInput(inputText: string): string | null {
    let parsed: unknown
    try {
        parsed = JSON.parse(inputText)
    } catch {
        return null
    }
    const repaired = JSON.stringify(stripNullProperties(parsed))
    return repaired === JSON.stringify(parsed) ? null : repaired
}

export const repairToolCall: ToolCallRepairFunction<ToolSet> = async ({ toolCall, error }) => {
    if (!InvalidToolInputError.isInstance(error)) return null
    const input = repairNullToolInput(toolCall.input)
    return input === null ? null : { ...toolCall, input }
}
