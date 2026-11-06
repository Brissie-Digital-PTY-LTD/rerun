'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useBoxViewer, useCanManageSpace } from '@/hooks/useBoxAccess'
import { BOX_NAME_MAX, UNNAMED_BOX_LABEL, type SpacePublic } from '@/lib/board/types'
import { useBoardStore } from '@/stores/board.store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(BOX_NAME_MAX, `Keep it under ${BOX_NAME_MAX} characters`),
})

type FormValues = z.infer<typeof schema>

// A Box is a rectangle on the board and a name, nothing else: renaming it is the whole of its
// settings, so it is a dialog rather than a panel.
export function RenameBoxDialog({ space, open, onOpenChange }: { space: SpacePublic | undefined; open: boolean; onOpenChange: (open: boolean) => void }) {
    const renameSpace = useBoardStore(s => s.renameSpace)
    const viewer = useBoxViewer()
    const canManage = useCanManageSpace(space?.id)
    const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: space?.name ?? '' } })

    // The name catches up by realtime, so the field is rearmed on each opening rather than tracked.
    useEffect(() => {
        if (open) form.reset({ name: space?.name ?? '' })
    }, [open, space?.name, form])

    const onSubmit = form.handleSubmit(values => {
        if (space) renameSpace(space.id, values.name.trim(), viewer)
        onOpenChange(false)
    })

    return (
        <Dialog open={open && canManage} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <Form {...form}>
                    <form onSubmit={onSubmit} className="flex flex-col gap-4">
                        <DialogHeader>
                            <DialogTitle>Rename Box</DialogTitle>
                            <DialogDescription>The name you read on the board. Nothing else depends on it.</DialogDescription>
                        </DialogHeader>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input label="Name" required autoFocus placeholder={UNNAMED_BOX_LABEL} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!form.watch('name').trim()}>
                                Rename
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
