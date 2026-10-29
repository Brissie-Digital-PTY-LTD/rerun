'use client'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { normalizeEmail } from '@/lib/email'
import { createClient } from '@/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const passwordSignInSchema = z.object({
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(1, 'Enter your password'),
})

// Reached only through /auth?method=password, which nothing links to. A password exists only on
// the accounts an admin gave one in /admin/users, so this form never signs anyone up.
export function PasswordSignInForm({ onSignedIn }: { onSignedIn: () => void }) {
    const form = useForm<z.infer<typeof passwordSignInSchema>>({
        resolver: zodResolver(passwordSignInSchema),
        defaultValues: { email: '', password: '' },
    })

    const submit = form.handleSubmit(async ({ email, password }) => {
        const { error } = await createClient().auth.signInWithPassword({ email: normalizeEmail(email), password })
        if (error) {
            form.setError('password', { message: error.status === 429 ? 'Too many attempts. Try again in a few minutes.' : 'Wrong email or password.' })
            return
        }
        onSignedIn()
    })

    return (
        <Form {...form}>
            <form onSubmit={submit} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input type="email" label="Email" placeholder="you@rerun.build" autoComplete="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input type="password" label="Password" autoComplete="current-password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
                    Sign in
                </Button>
            </form>
        </Form>
    )
}
