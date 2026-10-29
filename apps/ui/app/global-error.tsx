'use client'

import './globals.css'
import { CrashScreen } from '@/components/layout/CrashScreen'

export default function GlobalError() {
    // This replaces the root layout, so the theme class next-themes put on <html> would be dropped.
    const htmlClassName = typeof document === 'undefined' ? 'h-full antialiased' : document.documentElement.className

    return (
        <html lang="en" className={htmlClassName} suppressHydrationWarning>
            <body className="min-h-full flex flex-col font-sans">
                <CrashScreen />
            </body>
        </html>
    )
}
