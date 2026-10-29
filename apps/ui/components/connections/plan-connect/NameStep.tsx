'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type { TrackStep } from './ForemanTrack'
import { StepError } from './step-bits'

type NameStepParams = {
    linked: boolean
    name: string
    placeholder: string
    onName: (name: string) => void
    onDone: () => void
    saving: boolean
    error: string | null
}

// The last step of adding a plan: the connection already exists once the token lands (that is when
// the engine says whether the plan is accepted), so the name only renames it before its page opens.
export function nameStep({ linked, name, placeholder, onName, onDone, saving, error }: NameStepParams): TrackStep {
    const canFinish = linked && !saving && name.trim() !== ''
    return {
        title: 'Name it',
        remark: 'Last thing: a name.',
        body: (
            <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                        <Input hideRequired aria-label="Connection name" value={name} onChange={event => onName(event.target.value)} onKeyDown={event => event.key === 'Enter' && canFinish && onDone()} disabled={!linked || saving} placeholder={placeholder} className="h-8 w-full" />
                    </div>
                    <Button type="button" onClick={onDone} disabled={!canFinish}>
                        {saving ? 'Saving…' : 'Done'}
                    </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Shown in every coworker&apos;s model picker.</p>
                <StepError error={error} />
            </div>
        ),
    }
}
