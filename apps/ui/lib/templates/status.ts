import type { BadgeTone } from '@rerun/ui/primitives'
import { titleCase } from './labels'

const STATUS_TONES: Record<string, BadgeTone> = {
    in_review: 'orange',
    published: 'green',
    unlisted: 'cyan',
}

const STATUS_LABELS: Record<string, string> = { in_review: 'In review' }

export function templateStatusTone(status: string): BadgeTone {
    return STATUS_TONES[status] ?? 'neutral'
}

export function templateStatusLabel(status: string): string {
    return STATUS_LABELS[status] ?? titleCase(status)
}
