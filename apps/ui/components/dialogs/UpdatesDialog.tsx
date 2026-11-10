'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'

import { PanelDialogContent } from '@/components/dialogs/PanelDialogContent'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const UPSTREAM_RELEASES_API = 'https://api.github.com/repos/rerun-build/rerun/releases/latest'
const CHECK_CMD = 'cd ~/Work/working-projects/rerun && ./scripts/personal-fork-update.sh check'
const UPDATE_CMD = 'cd ~/Work/working-projects/rerun && ./scripts/personal-fork-update.sh update'

type Latest = { tag: string; url: string; name: string } | { error: string } | null

async function fetchLatest(): Promise<Latest> {
    try {
        const response = await fetch(UPSTREAM_RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
        if (!response.ok) return { error: `GitHub API returned ${response.status}` }
        const data = (await response.json()) as { tag_name?: string; html_url?: string; name?: string }
        if (!data.tag_name) return { error: 'No release tag found' }
        return { tag: data.tag_name, url: data.html_url ?? `https://github.com/rerun-build/rerun/releases/tag/${data.tag_name}`, name: data.name ?? data.tag_name }
    } catch {
        return { error: 'Could not reach GitHub' }
    }
}

function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text)
                    setCopied(true)
                    toast.success('Copied')
                    setTimeout(() => setCopied(false), 1500)
                } catch {
                    toast.error('Could not copy')
                }
            }}
        >
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            {copied ? 'Copied' : label}
        </Button>
    )
}

function CommandRow({ label, command }: { label: string; command: string }) {
    return (
        <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-muted/40 px-3 py-2 text-xs text-foreground"><code>{command}</code></pre>
                <CopyButton text={command} label="Copy" />
            </div>
        </div>
    )
}

export function UpdatesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [latest, setLatest] = useState<Latest>(null)
    const [loading, setLoading] = useState(false)
    const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA

    const load = async () => {
        setLoading(true)
        setLatest(await fetchLatest())
        setLoading(false)
    }

    useEffect(() => {
        if (!open) return
        void load()
    }, [open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <PanelDialogContent className="sm:h-auto sm:max-w-2xl">
                <DialogHeader className="border-b px-4 py-4">
                    <DialogTitle>Updates</DialogTitle>
                    <DialogDescription>Keep this self-hosted Rerun fork updated with upstream releases.</DialogDescription>
                </DialogHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
                    <section className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">Upstream release</p>
                            <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
                                {loading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
                                Refresh
                            </Button>
                        </div>
                        {latest === null || loading ? (
                            <p className="text-sm text-muted-foreground">Checking latest release…</p>
                        ) : 'error' in latest ? (
                            <p className="text-sm text-muted-foreground">{latest.error}</p>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium text-foreground">Latest: {latest.tag}</span>
                                <a href={latest.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:underline">
                                    Release notes <ExternalLinkIcon className="size-3.5" />
                                </a>
                            </div>
                        )}
                        {buildSha ? <p className="text-xs text-muted-foreground">Current build: <code>{buildSha}</code></p> : null}
                        <p className="text-xs text-muted-foreground">This fork tracks <code>rerun-build/rerun</code> release tags on branch <code>personal/local</code> (origin: <code>Brissie-Digital-PTY-LTD/rerun</code>).</p>
                    </section>

                    <section className="space-y-3">
                        <p className="text-sm text-muted-foreground">Updates run on the host machine (git merge + docker compose rebuild/restart). Run these from the host terminal:</p>
                        <CommandRow label="Check for updates" command={CHECK_CMD} />
                        <CommandRow label="Update to latest release" command={UPDATE_CMD} />
                        <CommandRow label="Rebuild/restart current state" command={`${CHECK_CMD.replace(' check', '')} rebuild`} />
                    </section>

                    <section className="space-y-1 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                        <p>On conflicts the script aborts the merge and reports files. Resolve in the repo (git rerere replays recorded fixes), merge the release tag again, then rebuild.</p>
                        <p>After a redeploy, Rerun will prompt you to reload when it detects the new build.</p>
                    </section>
                </div>
            </PanelDialogContent>
        </Dialog>
    )
}
