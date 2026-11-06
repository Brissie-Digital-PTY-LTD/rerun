import type { BoxAccess } from '@/lib/board/box-access'

type AccessSummaryInput = {
    isAdmin: boolean
    visibility: string | null | undefined
    access: BoxAccess
    // Rows of `space_members` on the Box. Only an admin reads every row, so a member's count would
    // be their own row at most: it is never shown to them.
    grantCount: number
    boxName: string
}

export type AccessSummary = { title: string; detail: string | null }

function ownLevel(access: BoxAccess): string {
    return access === 'manage' ? 'You manage this coworker' : 'You can use this coworker'
}

export function coworkerAccessSummary({ isAdmin, visibility, access, grantCount, boxName }: AccessSummaryInput): AccessSummary {
    const via = `via Box ${boxName}`
    if ((visibility ?? 'workspace') === 'workspace') return { title: 'Everyone in the workspace', detail: isAdmin ? via : `${ownLevel(access)}, ${via}` }
    if (!isAdmin) return { title: ownLevel(access), detail: via }
    if (grantCount === 0) return { title: 'Admins only', detail: via }
    return { title: `${grantCount} ${grantCount === 1 ? 'person' : 'people'}, ${via}`, detail: null }
}
