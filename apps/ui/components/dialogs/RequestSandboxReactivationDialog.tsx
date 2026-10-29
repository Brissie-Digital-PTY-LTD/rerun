'use client'

import { requestSandboxReactivationAction } from '@/app/api/_actions/workspace-restore.actions'
import { ExplainerPanel, type ExplainerPoint } from '@/components/dialogs/ExplainerPanel'
import { SplitDialogContent } from '@/components/dialogs/SplitDialogContent'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'

const NOTE_ID = 'sandbox-reactivation-note'

const POINTS: readonly ExplainerPoint[] = [
    { label: 'Archived after 30 days unused', description: 'A sandbox keeps a machine running, so one nobody opens gives it back.' },
    { label: 'Nothing was thrown away', description: 'Your coworkers, their memory and their files are saved with the archive.' },
    { label: 'We review every request', description: 'Tell us what you are building and we bring your sandbox back.' },
    { label: 'Back exactly as you left it', description: 'Once approved, the restore takes a couple of minutes.' },
] as const

export function RequestSandboxReactivationDialog({ open, onOpenChange, onRequested }: { open: boolean; onOpenChange: (open: boolean) => void; onRequested: () => void }) {
    const [note, setNote] = useState('')
    const [error, setError] = useState<string | undefined>(undefined)
    const [submitting, setSubmitting] = useState(false)

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next)
        if (!next) {
            setNote('')
            setError(undefined)
        }
    }

    const submit = async () => {
        setSubmitting(true)
        const result = await requestSandboxReactivationAction(note).catch(() => ({ ok: false, error: 'Could not send your request. Please try again.' }) as const)
        setSubmitting(false)
        if (!result.ok) return setError(result.error)
        onRequested()
        handleOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <SplitDialogContent aside={<ExplainerPanel title="Why was my sandbox archived?" points={POINTS} />}>
                <div className="flex min-h-0 flex-col p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle>Request reactivation</DialogTitle>
                        <p className="text-sm text-muted-foreground">Your sandbox comes back once we have approved your request.</p>
                    </DialogHeader>
                    <div className="-mx-1 -mt-1 min-h-0 flex-1 overflow-y-auto px-1 pt-1">
                        <Field label="What do you plan to build?" htmlFor={NOTE_ID} error={error} helperText="A sentence or two is enough.">
                            <Textarea id={NOTE_ID} value={note} onChange={event => setNote(event.target.value)} rows={6} maxLength={1000} autoFocus />
                        </Field>
                    </div>
                    <DialogFooter className="-mx-6 mt-auto -mb-6 border-t bg-muted/50 px-6 py-4">
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submit} disabled={!note.trim() || submitting}>
                            Send request
                        </Button>
                    </DialogFooter>
                </div>
            </SplitDialogContent>
        </Dialog>
    )
}
