import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
    title: 'Page not found',
}

export default function NotFound() {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
            <p className="font-mono text-sm text-muted-foreground/60">404</p>
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
                <p className="text-sm text-muted-foreground">
                    This page does not exist or has moved. Let&apos;s get you back on track.
                </p>
            </div>
            <Button asChild>
                <Link href="/">Back to dashboard</Link>
            </Button>
        </main>
    )
}
