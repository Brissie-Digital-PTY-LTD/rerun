'use client'

import { clearMemoriesAction, createMemoryAction, deleteMemoryAction, listMemoriesAction, recallMemoriesAction } from '@/app/api/_actions/agent.actions'
import { PanelDeleteButton } from '@/components/ui/panel-editor'
import { ClearMemoriesDialog } from '@/components/dialogs/ClearMemoriesDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TooltipDisabledReason } from '@/components/ui/tooltip'
import { useCanManageAgent } from '@/hooks/useBoxAccess'
import { BOX_MANAGE_REASON } from '@/lib/board/box-access'
import type { EngineMemory } from '@/lib/engine/types'
import { BrainIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from '@/lib/icons'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelList, PanelListHeader, PanelScroller } from '@/components/ui/panel-list'
import { PanelRow } from '@/components/ui/panel-row'
import { SkeletonPanelRows } from '@/components/ui/skeleton'
import { Badge } from '@rerun/ui/primitives'
import { useCallback, useEffect, useState } from 'react'

type AgentPanelMemoriesProps = {
    agentId: string
}

function MemoryRow({ memory, deleteDisabledReason, onDelete }: { memory: EngineMemory; deleteDisabledReason?: string; onDelete?: () => void }) {
    return (
        <PanelRow
            className="items-start gap-2"
            meta={
                <>
                    {memory.kind && (
                        <Badge size="xs" tone="neutral" glow={false} className="uppercase tracking-wider">
                            {memory.kind}
                        </Badge>
                    )}
                    {memory.status === 'dormant' && (
                        <Badge size="xs" tone="neutral" glow={false} fill="outline" className="uppercase tracking-wider">
                            dormant
                        </Badge>
                    )}
                    {memory.strength !== undefined && <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(memory.strength * 100)}%</span>}
                    {(memory.tags ?? []).map(t => (
                        <span key={t} className="text-[10px] text-muted-foreground">#{t}</span>
                    ))}
                </>
            }
            actions={
                onDelete && (
                    <TooltipDisabledReason reason={deleteDisabledReason}>
                        <PanelDeleteButton
                            label="Delete memory"
                            size="icon-xs"
                            disabled={!!deleteDisabledReason}
                            onClick={onDelete}
                            confirmTitle="Delete this memory?"
                            confirmDescription="The coworker forgets it for good. This cannot be undone."
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                        />
                    </TooltipDisabledReason>
                )
            }
        >
            <p className="whitespace-pre-wrap text-sm">{memory.content}</p>
        </PanelRow>
    )
}

export function AgentPanelMemories({ agentId }: AgentPanelMemoriesProps) {
    const [memories, setMemories] = useState<EngineMemory[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [content, setContent] = useState('')
    const [kind, setKind] = useState('')
    const [tags, setTags] = useState('')
    const [saving, setSaving] = useState(false)

    const [query, setQuery] = useState('')
    const [recall, setRecall] = useState<EngineMemory[] | null>(null)
    const [searching, setSearching] = useState(false)
    const [confirmClear, setConfirmClear] = useState(false)
    const canManage = useCanManageAgent(agentId)
    const manageReason = canManage ? undefined : BOX_MANAGE_REASON

    const load = useCallback(async () => {
        setLoading(true)
        setMemories(await listMemoriesAction(agentId))
        setLoading(false)
    }, [agentId])

    useEffect(() => {
        load()
    }, [load])

    const handleCreate = useCallback(async () => {
        if (!content.trim()) return
        setSaving(true)
        const result = await createMemoryAction(agentId, {
            content: content.trim(),
            kind: kind.trim() || undefined,
            tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        })
        setSaving(false)
        if (result.success) {
            setContent('')
            setKind('')
            setTags('')
            setCreating(false)
            load()
        }
    }, [agentId, content, kind, tags, load])

    const handleSearch = useCallback(async () => {
        if (!query.trim()) {
            setRecall(null)
            return
        }
        setSearching(true)
        setRecall(await recallMemoriesAction(agentId, query.trim(), 5))
        setSearching(false)
    }, [agentId, query])

    const handleDelete = useCallback(async (memoryId: string) => {
        const result = await deleteMemoryAction(agentId, memoryId)
        if (result.success) {
            setMemories(prev => prev.filter(m => m.id !== memoryId))
            setRecall(prev => (prev ? prev.filter(m => m.id !== memoryId) : prev))
        }
    }, [agentId])

    const handleClearAll = useCallback(async () => {
        setConfirmClear(false)
        await clearMemoriesAction(agentId)
        setQuery('')
        setRecall(null)
        load()
    }, [agentId, load])

    const shown = recall ?? memories

    return (
        <div className="flex flex-col h-full">
            <PanelListHeader className="flex-col items-stretch gap-2">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            hideRequired
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Recall memories..."
                            className="h-8 pl-7 text-xs"
                        />
                        {recall !== null && (
                            <button onClick={() => { setQuery(''); setRecall(null) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <XIcon className="size-3.5" />
                            </button>
                        )}
                    </div>
                    <TooltipDisabledReason reason={manageReason}>
                        <Button size="sm" variant="outline" disabled={!canManage} onClick={() => setCreating(c => !c)}>
                            <PlusIcon className="size-3.5 mr-1" /> New
                        </Button>
                    </TooltipDisabledReason>
                    {memories.length > 0 && (
                        <TooltipDisabledReason reason={manageReason}>
                            <Button size="icon-sm" variant="destructive" disabled={!canManage} onClick={() => setConfirmClear(true)} title="Clear all memories" aria-label="Clear all memories">
                                <Trash2Icon />
                            </Button>
                        </TooltipDisabledReason>
                    )}
                </div>
                {recall !== null && <p className="text-[11px] text-muted-foreground">{searching ? 'Searching…' : `${recall.length} recalled for "${query}"`}</p>}
            </PanelListHeader>

            {creating && canManage && (
                <div className="flex flex-col gap-2 p-3 border-b border-border bg-muted/30">
                    <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="The user prefers concise answers." className="text-xs min-h-20" />
                    <div className="flex gap-2">
                        <Input hideRequired value={kind} onChange={e => setKind(e.target.value)} placeholder="kind (e.g. preference)" className="h-8 text-xs" />
                        <Input hideRequired value={tags} onChange={e => setTags(e.target.value)} placeholder="tags, comma,sep" className="h-8 text-xs" />
                    </div>
                    <Button size="sm" loading={saving} onClick={handleCreate} disabled={!content.trim()}>
                        Save memory
                    </Button>
                </div>
            )}

            {loading ? (
                <SkeletonPanelRows rows={5} badge />
            ) : shown.length === 0 ? (
                <EmptyState
                    icon={BrainIcon}
                    title={recall !== null ? 'No matches' : 'No memories yet'}
                    description={recall !== null ? undefined : 'Your coworker saves long-term facts about you and its work here, so it keeps context across conversations.'}
                    action={
                        recall === null ? (
                            <TooltipDisabledReason reason={manageReason}>
                                <Button size="sm" variant="outline" disabled={!canManage} onClick={() => setCreating(true)}>
                                    <PlusIcon className="size-3.5 mr-1" /> Add memory
                                </Button>
                            </TooltipDisabledReason>
                        ) : undefined
                    }
                />
            ) : (
                <PanelScroller>
                    <PanelList>
                        {shown.map((m, i) => (
                            <MemoryRow key={m.id ?? i} memory={m} deleteDisabledReason={manageReason} onDelete={m.id ? () => handleDelete(m.id!) : undefined} />
                        ))}
                    </PanelList>
                </PanelScroller>
            )}

            <ClearMemoriesDialog open={confirmClear} onOpenChange={setConfirmClear} onConfirm={handleClearAll} />
        </div>
    )
}
