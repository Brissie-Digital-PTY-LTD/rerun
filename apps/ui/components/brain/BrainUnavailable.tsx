import { EmptyState } from '@/components/ui/empty-state'
import { BrainIcon } from '@/lib/icons'

export function BrainUnavailable() {
    return <EmptyState icon={BrainIcon} title="The Brain is not on this box yet" description="Your box runs a version of Rerun from before the Brain. It shows up here once the box is updated." />
}
