'use client'

import { requestConnectorAction } from '@/app/api/_actions/connector-requests.actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from '@/lib/icons'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type RequestConnectorDialogProps = {
    // The trigger (usually a Button) rendered via DialogTrigger asChild.
    children: React.ReactNode
    // Optional context: which agent the user was browsing when they asked.
    agentId?: string
}

const schema = z.object({ description: z.string().trim().min(1, 'Please describe the app you need') })

type FormValues = z.infer<typeof schema>

// Lets a user ask us to add a connector that the library does not have yet. The ask is
// persisted server-side via requestConnectorAction. Generic by design: no search term.
export function RequestConnectorDialog({ children, agentId }: RequestConnectorDialogProps) {
    const [open, setOpen] = useState(false)

    const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { description: '' } })
    const {
        formState: { isSubmitting },
    } = form

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) form.reset({ description: '' })
    }

    const onSubmit = form.handleSubmit(async ({ description }) => {
        const res = await requestConnectorAction({ description, agentId })
        if (!res.ok) {
            toast.error(res.error)
            return
        }
        toast.success('Request sent. Thanks, we will look into it.')
        handleOpenChange(false)
    })

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <Form {...form}>
                    <form onSubmit={onSubmit}>
                        <DialogHeader>
                            <DialogTitle>Request an app</DialogTitle>
                            <DialogDescription>Tell us which app you need and how you would use it. We will take it from there.</DialogDescription>
                        </DialogHeader>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem className="py-4">
                                    <FormControl>
                                        <Textarea autoFocus placeholder="Describe the app you need…" className="min-h-28" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
                                Send request
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
