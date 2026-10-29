'use client'

import { boxNameSuggestions } from '@/lib/onboarding/box-name-suggestions'
import { useOnboardingIndustry } from '@/lib/onboarding/useOnboardingIndustry'
import { useBoardStore } from '@/stores/board.store'

// The names offered under the Box name field: the industry read off the user's website, minus the
// Boxes the workspace already has. Both sources are already in memory, so this costs no fetch.
export function useBoxNameSuggestions(): string[] {
    const industry = useOnboardingIndustry()
    const spaces = useBoardStore(s => s.spaces)
    const taken = spaces.map(space => space.name ?? '')

    return boxNameSuggestions(industry, taken)
}
