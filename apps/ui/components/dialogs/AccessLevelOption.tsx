import type { BoxAccess } from '@/app/api/_auth/access'

export const ACCESS_OPTIONS: Record<BoxAccess, { label: string; description: string }> = {
    none: { label: 'No access', description: "Doesn't see this Box" },
    use: { label: 'Can use', description: 'Chat with its coworkers and see their work' },
    manage: { label: 'Can manage', description: 'Also edit, move and delete coworkers' },
}

// Width of an options list whose items carry a description, so the sentence fits under a narrow trigger.
export const OPTION_LIST_CLASS = 'w-72'

export function OptionWithDescription({ label, description }: { label: string; description: string }) {
    return (
        <span className="flex min-w-0 flex-col gap-0.5 py-0.5">
            <span>{label}</span>
            <span className="text-xs whitespace-normal text-muted-foreground">{description}</span>
        </span>
    )
}
