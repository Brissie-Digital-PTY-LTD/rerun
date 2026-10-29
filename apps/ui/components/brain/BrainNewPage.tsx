'use client'

import { saveBrainPageAction } from '@/app/api/_actions/brain.actions'
import { BrainEditor, type BrainEditorHandle } from '@/components/brain/editor/BrainEditor'
import { PageColumn, PageProperty, PageTitle, PageTypeIcon, PageTypeSelect } from '@/components/brain/BrainPageParts'
import { BrainTopBar } from '@/components/brain/BrainTopBar'
import type { SharedFileRef } from '@/components/brain/useSharedFilesTree'
import { brainSlugify } from '@/lib/brain/labels'
import { BRAIN_PAGE_ICONS } from '@/lib/brain/page-icons'
import type { BrainPageDetail } from '@/lib/engine/client'
import type { BrainPageSummary, BrainPageType } from '@rerun/contracts'
import { useRef, useState } from 'react'

type BrainNewPageProps = {
    pages: BrainPageSummary[]
    titles: Map<string, string>
    files: SharedFileRef[]
    onOpenPage: (slug: string) => void
    onOpenFile: (path: string) => void
    onCreated: (detail: BrainPageDetail) => void
}

// Nothing is written while the title is empty. The first time it is left with something in it, the
// page is created under the slug its title gives, and that slug stays: renaming later only changes
// the title, so the [[links]] other pages hold keep working.
export function BrainNewPage({ pages, titles, files, onOpenPage, onOpenFile, onCreated }: BrainNewPageProps) {
    const [title, setTitle] = useState('')
    const [type, setType] = useState<BrainPageType>('note')
    const [error, setError] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const content = useRef('')
    // Enter commits the title, then moves the focus to the body, which blurs the title and commits
    // it a second time in the same tick: the state alone would not see the first one yet.
    const started = useRef(false)
    const editorHandle = useRef<BrainEditorHandle>(null)

    const create = async () => {
        const trimmed = title.trim()
        if (!trimmed || started.current) return
        const slug = brainSlugify(trimmed)
        if (!slug) {
            setError('Use at least one letter or digit in the title.')
            return
        }
        if (titles.has(slug)) {
            setError(`A page "${titles.get(slug)}" already exists. Pick another title.`)
            return
        }
        started.current = true
        setCreating(true)
        const result = await saveBrainPageAction(slug, { title: trimmed, type, content: content.current, sources: [], baseHash: null })
        setCreating(false)
        if (!result.ok) {
            started.current = false
            setError(result.error)
            return
        }
        onCreated(result.detail)
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <BrainTopBar crumbs={[{ label: 'Pages' }, { label: title.trim() || 'New page', icon: BRAIN_PAGE_ICONS[type] }]} status={creating ? 'Saving…' : null} />
            <div className="min-h-0 flex-1 overflow-y-auto">
                <PageColumn>
                    <PageTypeIcon type={type} />
                    <PageTitle
                        value={title}
                        autoFocus
                        onChange={next => {
                            setTitle(next)
                            setError(null)
                        }}
                        onCommit={() => void create()}
                        onEnter={() => editorHandle.current?.focus('start')}
                    />
                    {error ? (
                        <p className="mt-1 text-xs text-destructive">{error}</p>
                    ) : (
                        title.trim() && <p className="mt-1 text-xs text-muted-foreground">Coworkers link to it as [[{brainSlugify(title)}]]</p>
                    )}

                    <div className="mt-4 space-y-0.5 border-b border-border pb-4">
                        <PageProperty label="Type">
                            <PageTypeSelect value={type} onChange={setType} />
                        </PageProperty>
                    </div>

                    <BrainEditor
                        className="mt-6"
                        content=""
                        pages={pages}
                        titles={titles}
                        files={files}
                        handleRef={editorHandle}
                        placeholder="Give the page a title, then type / for commands"
                        onOpenPage={onOpenPage}
                        onOpenFile={onOpenFile}
                        onChange={markdown => (content.current = markdown)}
                        onBlur={() => void create()}
                    />
                </PageColumn>
            </div>
        </div>
    )
}
