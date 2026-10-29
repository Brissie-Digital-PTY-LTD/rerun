'use client'

import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Segmented } from '@/components/ui/segmented'
import { MarkdownTextarea } from '@/components/ui/markdown-textarea'
import { Wand2 } from '@/lib/icons'
import { DEFAULT_INSTALL_PROMPT } from '@/lib/templates/install-template'

export type AgentSetupDraft = { required: boolean | null; prompt: string }

const CHOICES = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
]

// The same two fields are answered in two places: on the agent itself, and again in the capture
// review right before the archive is built. One component so the wording, and what "yes" implies,
// cannot drift between them.
export function AgentSetupFields({ value, onChange, disabled }: { value: AgentSetupDraft; onChange: (next: AgentSetupDraft) => void; disabled?: boolean }) {
    const prompt = value.prompt.trim()
    const isDefault = prompt === DEFAULT_INSTALL_PROMPT.trim()
    const useDefaultTemplate = () => onChange({ ...value, prompt: DEFAULT_INSTALL_PROMPT })

    const resetButton = (
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={prompt ? undefined : useDefaultTemplate} className="self-start">
            <Wand2 className="mr-1.5 size-3.5" />
            {prompt ? 'Reset to the default template' : 'Use the default template'}
        </Button>
    )

    return (
        <div className="flex flex-col gap-3">
            <Field label="Does this coworker need to be configured after install?" helperText="Answer once. Whoever installs this coworker sees the result, so an unanswered coworker cannot be published.">
                <Segmented
                    options={CHOICES}
                    value={value.required === null ? '' : value.required ? 'yes' : 'no'}
                    // Saying yes in front of an empty field means starting from the default rather
                    // than from a blank page. An answer already written is never overwritten.
                    onChange={next => {
                        const required = next === 'yes'
                        onChange({ required, prompt: required && !prompt ? DEFAULT_INSTALL_PROMPT : value.prompt })
                    }}
                    className={disabled ? 'pointer-events-none opacity-60' : undefined}
                />
            </Field>

            {value.required === true && (
                <Field label="Install instructions" helperText="Written to the coworker, not to the user: it reads this and walks them through it in the chat.">
                    <div className="flex flex-col gap-1.5">
                        <MarkdownTextarea
                            dialogTitle="Edit the install instructions"
                            disabled={disabled}
                            value={value.prompt}
                            onChange={prompt => onChange({ ...value, prompt })}
                            placeholder={DEFAULT_INSTALL_PROMPT}
                            className="min-h-40 font-mono text-xs"
                        />
                        {!isDefault &&
                            (prompt ? (
                                <ConfirmDialog
                                    title="Reset to the default template?"
                                    description="What is written here is replaced by the default instructions. This cannot be undone."
                                    confirmLabel="Reset"
                                    confirmVariant="default"
                                    onConfirm={useDefaultTemplate}
                                >
                                    {resetButton}
                                </ConfirmDialog>
                            ) : (
                                resetButton
                            ))}
                    </div>
                </Field>
            )}
        </div>
    )
}
