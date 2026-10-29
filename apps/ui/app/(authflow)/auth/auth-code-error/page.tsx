import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { routes } from '@/lib/routes'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
    return (
        <Card className="space-y-4 p-8">
            <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight">This link has expired</h1>
                <p className="text-sm text-muted-foreground">Sign-in links work once and expire after 15 minutes. Ask for a new code to continue.</p>
            </div>
            <Button asChild variant="secondary" className="w-full">
                <Link href={routes.auth}>Get a new code</Link>
            </Button>
        </Card>
    )
}
