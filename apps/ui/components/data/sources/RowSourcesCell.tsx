'use client'

import type { PaidSource } from '@rerun/contracts'
import { SourceFacepile } from './SourceLogo'

type RowSourcesCellProps = { sources: readonly PaidSource[]; onOpen: () => void }

export function RowSourcesCell({ sources, onOpen }: RowSourcesCellProps) {
    return (
        <button type="button" aria-label={`Sources: ${sources.map(source => source.name).join(', ')}`} title={sources.map(source => source.name).join(', ')} onClick={onOpen} onDoubleClick={event => event.stopPropagation()} className="-mx-1 flex min-h-8 items-center rounded-md px-1 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
            <SourceFacepile sources={sources} size="xs" />
        </button>
    )
}
