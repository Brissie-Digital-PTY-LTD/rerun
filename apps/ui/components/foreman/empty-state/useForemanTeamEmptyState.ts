'use client'

import { useMemo, useState } from 'react'

import { teamEmptyStateOf, type TeamEmptyStateModel } from '@/lib/foreman/team-empty-state'
import { readFirstName } from '@/lib/naming/first-name'
import { useBoardStore } from '@/stores/board.store'
import { useSession } from '@/supabase/session/SessionProvider'

// Null until the board is hydrated: an empty agent list before that would flash the "no coworkers
// yet" screen at someone who has a team.
export function useForemanTeamEmptyState(): { model: TeamEmptyStateModel; now: number } | null {
    const hydrated = useBoardStore(state => state.hydrated)
    const agents = useBoardStore(state => state.agents)
    const schedules = useBoardStore(state => state.agentSchedules)
    const { session } = useSession()
    const firstName = readFirstName(session?.user.user_metadata)
    const [now] = useState(() => Date.now())

    return useMemo(() => (hydrated ? { model: teamEmptyStateOf({ agents, schedules, firstName, now }), now } : null), [hydrated, agents, schedules, firstName, now])
}
