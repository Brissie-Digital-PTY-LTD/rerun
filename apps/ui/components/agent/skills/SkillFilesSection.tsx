'use client'

import { deleteSkillFileAction, writeSkillFileAction } from '@/app/api/_actions/agent.actions'
import { PanelDeleteButton } from '@/components/ui/panel-editor'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import { FileTextIcon, PlusIcon } from '@/lib/icons'
import { useCallback, useState } from 'react'

type SkillFilesSectionProps = {
    agentId: string
    slug: string
    files: string[]
    // A connector-managed skill hides these controls entirely; a sealed one keeps them in place,
    // off, wearing the reason.
    readOnly?: boolean
    addLockedReason?: string
    deleteLockedReason?: string
    onOpen: (path: string) => void
    onChanged: () => void
}

export function SkillFilesSection({ agentId, slug, files, readOnly, addLockedReason, deleteLockedReason, onOpen, onChanged }: SkillFilesSectionProps) {
    const [adding, setAdding] = useState(false)
    const [newPath, setNewPath] = useState('references/')
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleAdd = useCallback(async () => {
        const path = newPath.trim()
        if (!path || path.endsWith('/')) {
            setError('Enter a file path, for example references/checklist.md')
            return
        }
        setBusy(path)
        setError(null)
        const result = await writeSkillFileAction(agentId, slug, path, '')
        setBusy(null)
        if (!result.success) {
            setError(result.error ?? 'Failed to create file')
            return
        }
        setAdding(false)
        setNewPath('references/')
        onChanged()
        onOpen(path)
    }, [agentId, slug, newPath, onChanged, onOpen])

    const handleDelete = useCallback(async (path: string) => {
        setBusy(path)
        setError(null)
        const result = await deleteSkillFileAction(agentId, slug, path)
        setBusy(null)
        if (!result.success) setError(result.error ?? 'Failed to delete file')
        else onChanged()
    }, [agentId, slug, onChanged])

    return (
        <Field label="Bundled files" helperText="Long checklists, banks and corpora live here. The coworker reads one only when the procedure points to it.">
            <div className="rounded-md border border-border divide-y divide-border">
                {files.length === 0 && !adding && <p className="px-2.5 py-2 text-xs text-muted-foreground">No bundled files.</p>}
                {files.map(path => (
                    <div key={path} className="flex items-center gap-1 pr-1">
                        <button type="button" onClick={() => onOpen(path)} className="flex flex-1 min-w-0 items-center gap-2 px-2.5 py-2 text-left hover:bg-accent/30 transition-colors">
                            <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-xs font-mono">{path}</span>
                        </button>
                        {!readOnly && (
                            <TooltipDisabledReason reason={deleteLockedReason}>
                                <PanelDeleteButton
                                    label={`Delete ${path}`}
                                    busy={busy === path}
                                    disabled={!!deleteLockedReason}
                                    onClick={() => handleDelete(path)}
                                    confirmTitle={`Delete ${path}?`}
                                    confirmDescription="The file is removed from the skill. This cannot be undone."
                                />
                            </TooltipDisabledReason>
                        )}
                    </div>
                ))}
                {adding && (
                    <div className="flex items-center gap-1.5 p-2">
                        <div className="flex-1">
                            <Input value={newPath} onChange={e => setNewPath(e.target.value)} placeholder="references/checklist.md" className="h-8 text-xs font-mono" autoFocus />
                        </div>
                        <Button size="sm" loading={!!busy} onClick={handleAdd}>
                            Add
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setError(null) }}>
                            Cancel
                        </Button>
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {!readOnly && !adding && (
                <TooltipDisabledReason reason={addLockedReason} className="w-full">
                    <Button size="sm" variant="outline" className="w-full" disabled={!!addLockedReason} onClick={() => setAdding(true)}>
                        <PlusIcon className="size-3.5 mr-1" /> Add file
                    </Button>
                </TooltipDisabledReason>
            )}
        </Field>
    )
}
