'use client'

import { Suggestion, Suggestions } from '../chat/Suggestion'
import { cn } from '../cn'
import { WELCOME_ORB_SIZE } from './constants'
import { Orb } from './Orb'

export function ForemanEmptyState({ suggestions, onSuggestion, className }: { suggestions: readonly string[]; onSuggestion?: (suggestion: string) => void; className?: string }) {
    return (
        <div className={cn('flex size-full flex-col items-center justify-center gap-4 p-8 text-center', className)}>
            {/* La même orbe que l'accueil, et pas un glyphe : c'est elle qui est le Foreman, du coin
                du board au bouton d'envoi. */}
            <Orb size={WELCOME_ORB_SIZE} />
            <div className="space-y-1">
                <h3 className="font-medium text-sm text-foreground">Ask anything about your workspace</h3>
                <p className="text-muted-foreground text-sm">Rerun builds and runs your coworkers with you</p>
            </div>
            <Suggestions className="mt-2 justify-center">
                {suggestions.map(suggestion => (
                    <Suggestion key={suggestion} suggestion={suggestion} onClick={onSuggestion} />
                ))}
            </Suggestions>
        </div>
    )
}
