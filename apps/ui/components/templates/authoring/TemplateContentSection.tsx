'use client'

import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@rerun/ui/primitives'
import { RichTextEditor } from '@rerun/ui/rich-text-editor'
import * as React from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import type { TemplateFormValues } from '@/lib/templates/edit-schema'
import { TAGLINE_LIMIT } from '@/lib/templates/limits'
import { useTemplateAuthoring } from './actions-context'
import { PrefillButton } from './PrefillButton'

export function TemplateContentSection() {
    const { control, setValue } = useFormContext<TemplateFormValues>()
    const { actions } = useTemplateAuthoring()
    // The editor ignores an incoming value while it holds focus, so a prefill would land in the
    // form without repainting. Remounting it is the only way to force the new markdown in.
    const [editorKey, setEditorKey] = React.useState(0)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Content</CardTitle>
                <CardAction>
                    <PrefillButton
                        run={async brief => {
                            const result = await actions.prefillContent(brief)
                            if (!result.ok) return result
                            setValue('tagline', result.tagline, { shouldDirty: true })
                            setValue('longDescription', result.longDescription, { shouldDirty: true })
                            setEditorKey(key => key + 1)
                            return result
                        }}
                    />
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <Controller
                    control={control}
                    name="tagline"
                    render={({ field, fieldState }) => (
                        <Field
                            label="Tagline"
                            helperText={fieldState.error?.message ?? `${field.value.length}/${TAGLINE_LIMIT}, one sentence.`}
                            error={fieldState.error?.message}
                        >
                            <Textarea
                                {...field}
                                rows={2}
                                maxLength={TAGLINE_LIMIT}
                                placeholder="Finds prospects, writes the first touch and follows up until they reply."
                            />
                        </Field>
                    )}
                />
                <Controller
                    control={control}
                    name="longDescription"
                    render={({ field, fieldState }) => (
                        <Field label="Long description" optional error={fieldState.error?.message}>
                            <RichTextEditor key={editorKey} placeholder="What this template does, who it is for, and what it needs to run." value={field.value} onChange={field.onChange} />
                        </Field>
                    )}
                />
            </CardContent>
        </Card>
    )
}
