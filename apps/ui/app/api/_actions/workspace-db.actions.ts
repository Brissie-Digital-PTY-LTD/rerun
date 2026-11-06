'use server'

import { requireWorkspaceConnection } from '@/app/api/_auth/workspace-target'
import { NoEngineError } from '@/app/api/_services/workspace-engine.service'
import * as engine from '@/lib/engine/client'
import type { ReadDbTableRowsParams } from '@/lib/engine/client'
import type { TableListResult } from '@/lib/data/source'
import type { EngineDbRows } from '@/lib/engine/types'

// An engine that predates the shared database answers a bare 404 on this route, which reads as
// "unreachable" unless we name it: the workspace is fine, its machine is just behind.
const OUTDATED_ENGINE = 'This workspace runs on a machine that needs an engine update before it can host a shared database.'

const UNREACHABLE = 'Could not reach the machine of this workspace.'

function describe(err: unknown, fallback: string): string {
    const message = err instanceof Error ? err.message : ''
    if (/failed: 404\b/.test(message)) return OUTDATED_ENGINE
    return message || fallback
}

// Resolving the workspace fails with messages written for the user (not a member, signed out); the
// engine call fails with transport details that are not.
export async function listWorkspaceTablesAction(): Promise<TableListResult> {
    let conn: Awaited<ReturnType<typeof requireWorkspaceConnection>>
    try {
        conn = await requireWorkspaceConnection()
    } catch (err) {
        if (err instanceof NoEngineError) return { success: true, tables: [] }
        return { success: false, error: err instanceof Error && err.message ? err.message : UNREACHABLE }
    }
    try {
        return { success: true, tables: await engine.listDbTables(conn, engine.SPACE_DATA_BASE) }
    } catch (err) {
        const message = err instanceof Error ? err.message : ''
        return { success: false, error: /failed: 404\b/.test(message) ? OUTDATED_ENGINE : UNREACHABLE }
    }
}

export async function readWorkspaceTableRowsAction(table: string, params: ReadDbTableRowsParams): Promise<EngineDbRows | null> {
    try {
        const conn = await requireWorkspaceConnection()
        return await engine.readDbTableRows(conn, engine.SPACE_DATA_BASE, table, params)
    } catch {
        return null
    }
}

export async function deleteWorkspaceTableRowsAction(table: string, rowids: (number | string)[]): Promise<{ success: boolean; error?: string; deleted?: number }> {
    try {
        const conn = await requireWorkspaceConnection()
        const { deleted } = await engine.deleteDbTableRows(conn, engine.SPACE_DATA_BASE, table, rowids)
        return { success: true, deleted }
    } catch (err) {
        return { success: false, error: describe(err, 'Failed to delete rows') }
    }
}

export async function dropWorkspaceTableAction(table: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = await requireWorkspaceConnection()
        await engine.dropDbTable(conn, engine.SPACE_DATA_BASE, table)
        return { success: true }
    } catch (err) {
        return { success: false, error: describe(err, 'Failed to delete table') }
    }
}

export async function purgeWorkspaceTableAction(table: string): Promise<{ success: boolean; error?: string; deleted?: number }> {
    try {
        const conn = await requireWorkspaceConnection()
        const { deleted } = await engine.purgeDbTable(conn, engine.SPACE_DATA_BASE, table)
        return { success: true, deleted }
    } catch (err) {
        return { success: false, error: describe(err, 'Failed to purge table') }
    }
}
