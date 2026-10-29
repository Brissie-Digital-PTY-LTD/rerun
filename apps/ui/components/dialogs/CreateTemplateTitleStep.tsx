'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { slugify } from '@/lib/slugify'
import { TITLE_LIMIT } from '@/lib/templates/limits'

const schema = z.object({
    title: z.string().trim().min(1, 'A title is required').max(TITLE_LIMIT),
})

type FormValues = z.infer<typeof schema>

// A title is enough to get a draft: it is what the slug and the archive paths are addressed by, so
// the rest of the wizard needs a row to exist before it can capture anything into it.
export function CreateTemplateTitleStep({ onCreate, onCancel }: { onCreate: (title: string) => Promise<void>; onCancel: () => void }) {
    const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { title: '' } })

    const {
        formState: { isSubmitting },
    } = form

    const title = useWatch({ control: form.control, name: 'title' }) ?? ''
    const slug = slugify(title)

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(({ title }) => onCreate(title))} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input
                                        label="Title"
                                        autoFocus
                                        maxLength={TITLE_LIMIT}
                                        placeholder="e.g. Outbound SDR"
                                        helperText={`${title.length}/${TITLE_LIMIT} · ${slug ? `/templates/${slug}` : 'The public address is derived from the title.'}`}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <DialogFooter className="mt-auto -mx-6 -mb-6 border-t bg-muted/50 px-6 py-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={!slug} loading={isSubmitting}>
                        Continue
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}
