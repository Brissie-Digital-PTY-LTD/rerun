// The open source build of `paid-data-sources.ts`: no paid data is ever bought, so no call has a
// source to show.
import type { PaidDataCapability } from './paid-data.js'

export type PaidSource = { id: string; name: string; domain: string | null; kind: 'origin' | 'vendor' | 'generic' }

const GENERIC_SOURCE: PaidSource = { id: 'generic', name: 'Data provider', domain: null, kind: 'generic' }

export function paidDataSourceOf(_capability: PaidDataCapability, _servedBy: string | null | undefined): PaidSource {
    return GENERIC_SOURCE
}

export function paidDataSourceOfCall(_capability: string, _servedBy: string | null | undefined): PaidSource {
    return GENERIC_SOURCE
}

export type PaidCallReceipt = { status: 'found' | 'nothing_found' | 'pending' | 'failed' | 'not_run'; servedBy: string | null; found: number; asked: number; verdict: string | null }

export function paidCallReceipt(_capability: PaidDataCapability, _params: Record<string, unknown> | undefined, _rawOutput: unknown): PaidCallReceipt | null {
    return null
}

export type PaidSourceLine = { source: PaidSource; capability: PaidDataCapability; activity: string; label: string; found: number; asked: number }

export type PaidTurnSources = { sources: PaidSource[]; lines: PaidSourceLine[]; emails: { checked: number; valid: number } }

export function paidDataSourcesByTurn(_messages: readonly unknown[]): Map<string, PaidTurnSources> {
    return new Map()
}
