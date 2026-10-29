'use client'

import { deleteWorkspaceTableRowsAction, dropWorkspaceTableAction, listWorkspaceTablesAction, purgeWorkspaceTableAction, readWorkspaceTableRowsAction } from '@/app/api/_actions/workspace-db.actions'
import { DataBrowser } from '@/components/data/DataBrowser'
import { viewActions, type DataFocus, type DataSource } from '@/lib/data/source'
import { useMemo } from 'react'
import { withTabWorkspace } from '@/lib/workspace/tab-workspace'

export const SHARED_TABLES_EMPTY = {
    title: 'No shared tables yet',
    description:
        'Every coworker of the workspace reads and writes this database. When they need a common record (a catalog, a queue, a list several coworkers work through), they create tables here that you can browse anytime.',
}

type SharedDataPanelProps = {
    initial?: DataFocus | null
    onInitialConsumed?: () => void
    table?: string
    onTableDropped?: () => void
}

// The database every agent of the workspace reads and writes, as opposed to the private one each
// agent keeps to itself.
export function SharedDataPanel({ initial, onInitialConsumed, table, onTableDropped }: SharedDataPanelProps) {
    const source = useMemo<DataSource>(
        () => ({
            scope: 'shared',
            storageKey: 'shared',
            listTables: () => listWorkspaceTablesAction(),
            readRows: (table, params) => readWorkspaceTableRowsAction(table, params),
            deleteRows: (table, rowids) => deleteWorkspaceTableRowsAction(table, rowids),
            dropTable: table => dropWorkspaceTableAction(table),
            purgeTable: table => purgeWorkspaceTableAction(table),
            exportUrl: (table, params) => {
                const qs = new URLSearchParams({ scope: 'shared', table, format: params.format })
                if (params.sort) qs.set('sort', params.sort)
                if (params.dir) qs.set('dir', params.dir)
                if (params.q) qs.set('q', params.q)
                if (params.where?.length) qs.set('where', JSON.stringify(params.where))
                return withTabWorkspace(`/api/data/export?${qs.toString()}`)
            },
            ...viewActions({ kind: 'shared' }),
            unreachableMessage: 'Could not reach the machine of this workspace.',
            emptyTitle: SHARED_TABLES_EMPTY.title,
            emptyDescription: SHARED_TABLES_EMPTY.description,
        }),
        []
    )

    return <DataBrowser source={source} initial={initial} onInitialConsumed={onInitialConsumed} table={table} onTableDropped={onTableDropped} />
}
