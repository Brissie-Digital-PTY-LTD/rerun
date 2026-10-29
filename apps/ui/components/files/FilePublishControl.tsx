'use client'

import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CopyIcon, ExternalLinkIcon, GlobeIcon } from '@/lib/icons'
import { useState } from 'react'

type FilePublishControlProps = {
    name: string
    publicUrl?: string
    onPublish: () => void
    onUnpublish?: () => void
}

export function FilePublishControl({ name, publicUrl, onPublish, onUnpublish }: FilePublishControlProps) {
    const [confirmingUnshare, setConfirmingUnshare] = useState(false)

    if (!publicUrl) {
        return (
            <Button size="icon-sm" variant="ghost" onClick={onPublish} title="Publish publicly" aria-label="Publish publicly">
                <GlobeIcon className="size-4" />
            </Button>
        )
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" title="Public link" aria-label="Public link">
                        <GlobeIcon className="size-4 text-emerald-400" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto">
                    <DropdownMenuItem className="whitespace-nowrap" onSelect={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>
                        <ExternalLinkIcon />
                        Open public link
                    </DropdownMenuItem>
                    <DropdownMenuItem className="whitespace-nowrap" onSelect={() => navigator.clipboard.writeText(publicUrl)}>
                        <CopyIcon />
                        Copy public link
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" inset onSelect={() => setConfirmingUnshare(true)}>
                        Unshare
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {confirmingUnshare && (
                <ConfirmDialog
                    open
                    onOpenChange={open => !open && setConfirmingUnshare(false)}
                    title={`Unshare ${name}?`}
                    description="The public link stops working right away. Anyone holding it gets a 404."
                    confirmLabel="Unshare"
                    onConfirm={() => {
                        onUnpublish?.()
                        setConfirmingUnshare(false)
                    }}
                />
            )}
        </>
    )
}
