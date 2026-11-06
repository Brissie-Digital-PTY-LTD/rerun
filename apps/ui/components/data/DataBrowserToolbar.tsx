'use client'

import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TooltipDisabledReason, TooltipLabeled } from '@/components/ui/tooltip'
import { BrushCleaningIcon, DownloadIcon, EllipsisIcon, SearchIcon, Trash2Icon, XIcon } from '@/lib/icons'
import { useState } from 'react'

type DataBrowserToolbarProps = {
    search: string
    selectedCount: number
    busy: boolean
    onSearchChange: (value: string) => void
    onClearSelection: () => void
    onDeleteSelected: () => void
    onExport: (format: 'csv' | 'json') => void
    onPurgeTable: () => void
    onDropTable: () => void
    /** Why this viewer cannot change the table: emptying it, deleting it, or deleting its rows. */
    tableActionsReason?: string
}

/** The right end of the tabs: a search that unfolds, the table menu, or what to do with the selected rows. */
export function DataBrowserToolbar({ search, selectedCount, busy, onSearchChange, onClearSelection, onDeleteSelected, onExport, onPurgeTable, onDropTable, tableActionsReason }: DataBrowserToolbarProps) {
    const [searchOpen, setSearchOpen] = useState(false)
    const showSearch = searchOpen || search !== ''

    if (selectedCount > 0) {
        return (
            <div className="flex items-center gap-1">
                <span className="px-1 text-xs whitespace-nowrap text-muted-foreground">{selectedCount} selected</span>
                <TooltipDisabledReason reason={tableActionsReason}>
                    <ConfirmDialog
                        title={selectedCount === 1 ? 'Delete this row?' : `Delete ${selectedCount} rows?`}
                        description={`${selectedCount === 1 ? 'The row is' : 'The rows are'} removed from the table for good. This cannot be undone.`}
                        onConfirm={onDeleteSelected}
                    >
                        <Button variant="ghost" size="xs" disabled={busy || !!tableActionsReason} className="text-destructive hover:text-destructive">
                            <Trash2Icon className="size-3.5" />
                            Delete
                        </Button>
                    </ConfirmDialog>
                </TooltipDisabledReason>
                <TooltipLabeled label="Clear selection">
                    <Button variant="ghost" size="icon-xs" onClick={onClearSelection} aria-label="Clear selection" className="text-muted-foreground">
                        <XIcon className="size-3.5" />
                    </Button>
                </TooltipLabeled>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-0.5">
            {showSearch ? (
                <div className="flex h-7 w-36 items-center gap-1.5 rounded-md border border-border px-2 @md:w-48">
                    <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <input
                        autoFocus={searchOpen}
                        value={search}
                        onChange={event => onSearchChange(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Escape') {
                                onSearchChange('')
                                setSearchOpen(false)
                            }
                        }}
                        onBlur={() => search === '' && setSearchOpen(false)}
                        placeholder="Search"
                        aria-label="Search rows"
                        className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    />
                    {search !== '' && (
                        <button
                            type="button"
                            onClick={() => {
                                onSearchChange('')
                                setSearchOpen(false)
                            }}
                            aria-label="Clear search"
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <XIcon className="size-3" />
                        </button>
                    )}
                </div>
            ) : (
                <TooltipLabeled label="Search">
                    <Button variant="ghost" size="icon-xs" onClick={() => setSearchOpen(true)} aria-label="Search rows" className="text-muted-foreground">
                        <SearchIcon className="size-3.5" />
                    </Button>
                </TooltipLabeled>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs" disabled={busy} aria-label="Table actions" className="text-muted-foreground">
                        <EllipsisIcon className="size-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel inset className="text-xs text-muted-foreground">
                        Export
                    </DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => onExport('csv')}>
                        <DownloadIcon />
                        CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onExport('json')}>
                        <DownloadIcon />
                        JSON
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <TooltipDisabledReason reason={tableActionsReason} side="left" className="flex w-full">
                        <DropdownMenuItem disabled={!!tableActionsReason} onSelect={onPurgeTable} className="w-full">
                            <BrushCleaningIcon />
                            Purge table
                        </DropdownMenuItem>
                    </TooltipDisabledReason>
                    <TooltipDisabledReason reason={tableActionsReason} side="left" className="flex w-full">
                        <DropdownMenuItem variant="destructive" disabled={!!tableActionsReason} onSelect={onDropTable} className="w-full">
                            <Trash2Icon />
                            Delete table
                        </DropdownMenuItem>
                    </TooltipDisabledReason>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
