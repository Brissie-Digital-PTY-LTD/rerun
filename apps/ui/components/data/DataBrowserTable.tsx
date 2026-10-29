'use client'

import { EditableCell } from '@/components/data/EditableCell'
import { KIND_ICONS } from '@/components/data/FriendlyCell'
import { Checkbox } from '@/components/ui/checkbox'
import { columnLabel, isNumericKind, rowCurrency, type FriendlyColumn } from '@/lib/data/friendly-columns'
import { ArrowDownIcon, ArrowUpIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { CellContext } from '@rerun/ui/chat'
import { type Table } from '@tanstack/react-table'

export type DbRow = Record<string, unknown>

export function rowKey(row: DbRow): string | null {
    const value = row.__rowid
    return value === undefined || value === null ? null : String(value)
}

type DataBrowserTableProps = {
    table: Table<DbRow>
    /** The friendly reading of every column, by column name. */
    friendly: Map<string, FriendlyColumn>
    canSelectRows: boolean
    allPageSelected: boolean
    selectedRowIds: Set<string>
    onToggleRow: (key: string) => void
    onToggleAllPage: () => void
    /** Column name to display format, from the active view. */
    formats?: Record<string, string>
    cellContext: CellContext
    onEditCell: (row: DbRow, column: string, text: string) => Promise<boolean>
}

export function DataBrowserTable({ table, friendly, canSelectRows, allPageSelected, selectedRowIds, onToggleRow, onToggleAllPage, formats = {}, cellContext, onEditCell }: DataBrowserTableProps) {
    const selecting = selectedRowIds.size > 0
    const columnOf = (id: string): FriendlyColumn => friendly.get(id) ?? { key: id, label: columnLabel(id), kind: 'text' }
    const gutter = 'w-8 min-w-8 border-b border-border/70 pl-3 pr-1'
    const firstColumnPadding = canSelectRows ? undefined : 'pl-4 @3xl:pl-2'

    return (
        <table className="w-full min-w-max border-collapse text-[13px]">
            <thead className="sticky top-0 z-20 bg-background">
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                        {canSelectRows && (
                            <th className={cn(gutter, 'h-9 border-border')}>
                                <span className={cn('flex transition-opacity', selecting || allPageSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100')}>
                                    <Checkbox size="sm" checked={allPageSelected} onCheckedChange={onToggleAllPage} aria-label="Select all rows on this page" />
                                </span>
                            </th>
                        )}
                        {headerGroup.headers.map((header, index) => {
                            const column = columnOf(header.column.id)
                            const Icon = KIND_ICONS[column.kind]
                            const sorted = header.column.getIsSorted()
                            return (
                                <th
                                    key={header.id}
                                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                                    className={cn(
                                        'h-9 border-b border-border px-2 text-left font-normal whitespace-nowrap text-muted-foreground',
                                        index > 0 && 'border-l border-border/70',
                                        index === 0 && firstColumnPadding,
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={header.column.getToggleSortingHandler()}
                                        className={cn('inline-flex w-full items-center gap-1.5 hover:text-foreground', isNumericKind(column.kind) && !formats[column.key] && 'justify-end')}
                                    >
                                        <Icon className="size-3.5 shrink-0 opacity-70" />
                                        <span className={cn(sorted && 'text-foreground')}>{column.label}</span>
                                        {sorted === 'asc' && <ArrowUpIcon className="size-3 text-foreground" />}
                                        {sorted === 'desc' && <ArrowDownIcon className="size-3 text-foreground" />}
                                    </button>
                                </th>
                            )
                        })}
                    </tr>
                ))}
            </thead>
            <tbody>
                {table.getRowModel().rows.map(row => {
                    const key = rowKey(row.original)
                    const checked = key !== null && selectedRowIds.has(key)
                    const currency = rowCurrency(row.original)
                    return (
                        <tr key={row.id} className={cn('group', checked ? 'bg-accent/50' : 'hover:bg-accent/40')}>
                            {canSelectRows && (
                                <td className={cn(gutter, 'h-9')}>
                                    {key !== null && (
                                        <span
                                            className={cn(
                                                'flex transition-opacity',
                                                selecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100',
                                            )}
                                        >
                                            <Checkbox size="sm" checked={checked} onCheckedChange={() => onToggleRow(key)} aria-label="Select row" />
                                        </span>
                                    )}
                                </td>
                            )}
                            {row.getVisibleCells().map((cell, index) => {
                                const column = columnOf(cell.column.id)
                                const shared = { value: cell.getValue(), column, format: formats[column.key], context: cellContext, currency }
                                return (
                                    <td key={cell.id} className={index === 0 ? cn('h-9 max-w-64 border-b border-border/70 px-2', firstColumnPadding) : 'h-9 max-w-72 border-b border-l border-border/70 px-2'}>
                                        <EditableCell {...shared} onCommit={key !== null ? text => onEditCell(row.original, column.key, text) : undefined} />
                                    </td>
                                )
                            })}
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}
