'use client'

import type { ApiKeyView } from '@/app/api/_actions/api-keys.actions'
import { Button } from '@/components/ui/button'
import { BanIcon } from '@/lib/icons'
import { shortRelativeTime } from '@/lib/time'

// One block for the whole set: the rows share its border and are told apart by a divider rather
// than each floating on its own. The empty case keeps the block so the section holds its shape.
export function ApiKeyList({ keys, busy, onRevoke }: { keys: ApiKeyView[]; busy: boolean; onRevoke: (key: ApiKeyView) => void }) {
    return (
        <div className="min-w-0 overflow-hidden rounded-lg border border-border/60">
            {keys.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No key yet. A key carries the whole workspace, so treat it like a password.</p>
            ) : (
                <div className="divide-y divide-border/60">
                    {keys.map(key => (
                        <Row key={key.id} apiKey={key} busy={busy} onRevoke={onRevoke} />
                    ))}
                </div>
            )}
        </div>
    )
}

function Row({ apiKey, busy, onRevoke }: { apiKey: ApiKeyView; busy: boolean; onRevoke: (key: ApiKeyView) => void }) {
    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="min-w-0 flex-1">
                <span className="block truncate text-sm">{apiKey.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{apiKey.keyPrefix}…</span>
            </div>

            <span className="shrink-0 text-[11px] text-muted-foreground">{apiKey.lastUsedAt ? `Used ${shortRelativeTime(apiKey.lastUsedAt)}` : 'Never used'}</span>

            {/* Revoking breaks whatever runs on that key, so the click only asks: the confirmation
                dialog is what actually revokes. */}
            <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={busy}
                onClick={() => onRevoke(apiKey)}
                title="Revoke this key"
                aria-label="Revoke this key"
                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
            >
                <BanIcon className="size-4" />
            </Button>
        </div>
    )
}
