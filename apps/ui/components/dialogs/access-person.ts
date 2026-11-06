import type { AccessLevel, SpaceVisibility } from '@/app/api/_auth/access'
import type { BoxScope } from '@/app/api/_auth/box-scope'
import { UNNAMED } from '@/hooks/useMemberProfiles'
import type { AuthorProfile } from '@/lib/chat/message-author'

// A person as the access dialogs print them: their name when the directory has one, else their email.
export function personLabel(profile: AuthorProfile | null, email: string | null): { title: string; email: string | null; named: boolean } {
    const name = profile?.name && profile.name !== UNNAMED ? profile.name : null
    return { title: name ?? email ?? 'Teammate', email, named: !!name }
}

export const asIs = (path: string) => path

export const BOX_ACCESS_ADMIN_ONLY = 'Only an admin can change who can access a Box'
export const ADMINS_ALWAYS = 'Admins always have access'

// What a change of access does to the person, as the confirmation dialogs print it.
export function removalOutcome(visibility: SpaceVisibility, access: AccessLevel, isAdmin: boolean): string {
    if (isAdmin) return 'Admins keep access to every Box; this only removes the row.'
    if (visibility === 'restricted') return 'They lose access to this Box and its coworkers right away.'
    if (access === 'manage') return 'They stop managing this Box. It stays open to everyone in the workspace.'
    return 'Their own access goes. The Box stays open to everyone in the workspace.'
}

export function scopeOutcome(): string {
    return 'They keep only the Boxes named below. Every Box open to everyone goes out of their reach right away.'
}

// Null when dropping the grant costs them nothing: the Box stays open to everyone and they still see it.
export function levelOutcome(box: { visibility: SpaceVisibility }, boxScope: BoxScope): string | null {
    if (box.visibility !== 'restricted' && boxScope === 'all') return null
    return 'They lose access to this Box and its coworkers right away.'
}
