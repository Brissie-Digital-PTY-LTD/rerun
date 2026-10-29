// The open source build of `paid-data.ts`: the catalog of data Rerun Cloud buys for a coworker is
// not part of it, so no call ever names a capability. The tool names stay, because a conversation
// imported from Rerun Cloud can still hold one.
import { unwrapToolOutputEnvelope } from './tool-output.js'

export const PAID_DATA_TOOL = 'paid_data'
export const PAID_DATA_CATALOG_TOOL = 'paid_data_catalog'
export const PAID_DATA_OUT_OF_CREDIT = 'out_of_credit'

export type PaidDataCapability = never

export function paidDataEntry(capability: PaidDataCapability): { activity: string } {
    return capability
}

export function isPaidDataTool(toolName: string): boolean {
    return toolName === PAID_DATA_TOOL
}

export function capabilityOfCall(_toolName: string, _input: unknown): PaidDataCapability | null {
    return null
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0

export function billedMicrosOf(output: unknown): number {
    const billed = (unwrapToolOutputEnvelope(output) as { billedMicros?: unknown } | null | undefined)?.billedMicros
    return isCount(billed) ? billed : 0
}

export function isPaidDataOutOfCredit(output: unknown): boolean {
    return (unwrapToolOutputEnvelope(output) as { reason?: unknown } | null | undefined)?.reason === PAID_DATA_OUT_OF_CREDIT
}
