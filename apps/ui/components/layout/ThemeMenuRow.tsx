'use client'

import { ThemeToggle } from '@rerun/ui/theme'

import { SunMoonIcon } from '@/lib/icons'

// A plain row rather than a menu item: the segments take the click themselves, so picking a theme
// leaves the menu open on the result.
export function ThemeMenuRow() {
    return (
        <div className="flex items-center gap-2 px-1.5 py-1 text-sm text-muted-foreground">
            <SunMoonIcon className="size-4" />
            Theme
            <ThemeToggle className="ml-auto origin-right scale-90 shadow-none" />
        </div>
    )
}
