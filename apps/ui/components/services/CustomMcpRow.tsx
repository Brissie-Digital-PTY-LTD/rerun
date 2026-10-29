'use client'

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { PanelDeleteButton } from '@/components/ui/panel-editor'
import { PanelRow } from '@/components/ui/panel-row'
import { CustomMcpStatusBadge } from '@/components/services/CustomMcpStatusBadge'
import { serviceIconProps } from '@/lib/services/icons'
import type { CustomMcpServer, CustomMcpStatus } from '@/lib/services/types'
import { PencilIcon } from '@/lib/icons'
import { Badge } from '@rerun/ui/primitives'

type CustomMcpRowProps = {
    server: CustomMcpServer
    status: CustomMcpStatus | undefined
    statusLoading: boolean
    onConnect: () => void
    onEdit: () => void
    onRemove: () => void
}

export function CustomMcpRow({ server, status, statusLoading, onConnect, onEdit, onRemove }: CustomMcpRowProps) {
    const canSignIn = status?.status === 'needs_auth' && !!server.signInUrl
    return (
        <PanelRow
            leading={<Icon {...serviceIconProps(server.icon, 'custom')} size="sm" />}
            title={
                <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{server.displayName}</span>
                    <Badge size="xs" tone="neutral" glow={false}>
                        Custom
                    </Badge>
                </span>
            }
            description={server.host ?? server.transport}
            actions={
                <>
                    <span className="mr-2 flex items-center empty:hidden">
                        <CustomMcpStatusBadge status={status} loading={statusLoading} />
                    </span>
                    {canSignIn && (
                        <Button size="sm" variant="outline" onClick={onConnect}>
                            Connect
                        </Button>
                    )}
                    <Button size="icon-sm" variant="ghost" className="text-muted-foreground" aria-label={`Edit ${server.displayName}`} onClick={onEdit}>
                        <PencilIcon />
                    </Button>
                    <PanelDeleteButton
                        label={`Remove ${server.displayName}`}
                        onClick={onRemove}
                        confirmTitle={`Remove ${server.displayName}?`}
                        confirmDescription="The coworker loses every tool this server exposes, and its sign-in is cleared."
                        confirmLabel="Remove"
                    />
                </>
            }
        />
    )
}
