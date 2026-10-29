// When the new agent runs, as chosen in the planner. Nothing here is written anywhere: the choice
// only words a line of the agent's first message, and the agent sets its own schedule up from it.
//
// `described` is the default: whatever the description says, or nothing at all.
export type ScheduleChoice = { kind: 'described' } | { kind: 'preset'; id: SchedulePresetId } | { kind: 'custom'; days: boolean[]; time: string } | { kind: 'on-demand' }

export type SchedulePresetId = 'weekday' | 'monday'

export const SCHEDULE_PRESETS: { id: SchedulePresetId; label: string; detail: string; phrase: string }[] = [
    { id: 'weekday', label: 'Every weekday at 9:00', detail: 'Monday to Friday', phrase: 'every weekday at 9:00' },
    { id: 'monday', label: 'Every Monday at 9:00', detail: 'Once a week', phrase: 'every Monday at 9:00' },
]

export const DESCRIBED: ScheduleChoice = { kind: 'described' }
export const ON_DEMAND_LABEL = 'Only when I ask'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_INITIALS = DAYS.map(day => day[0])

// A custom week opens on the working days, the way most agents of a team run.
export const DEFAULT_CUSTOM: Extract<ScheduleChoice, { kind: 'custom' }> = { kind: 'custom', days: [true, true, true, true, true, false, false], time: '09:00' }

// The last day stays on: a week with no day in it is "only when I ask", which has its own row.
export function toggleDay(days: boolean[], index: number): boolean[] {
    const next = days.map((on, i) => (i === index ? !on : on))
    return next.some(Boolean) ? next : days
}

function clock(time: string): string {
    const [hours, minutes] = time.split(':')
    return `${Number(hours)}:${minutes ?? '00'}`
}

function daysPhrase(days: boolean[]): string {
    const on = DAYS.filter((_, index) => days[index])
    if (on.length === DAYS.length) return 'every day'
    if (on.length === 5 && !days[5] && !days[6]) return 'every weekday'
    if (on.length === 1) return `every ${on[0]}`
    return `every ${on.slice(0, -1).join(', ')} and ${on[on.length - 1]}`
}

function phrase(choice: Extract<ScheduleChoice, { kind: 'preset' | 'custom' }>): string {
    if (choice.kind === 'preset') return SCHEDULE_PRESETS.find(preset => preset.id === choice.id)?.phrase ?? ''
    return `${daysPhrase(choice.days)} at ${clock(choice.time)}`
}

// What the Schedule button says back once a choice is made. `described` has no words of its own:
// the button then shows the timing read in the description, or its plain name.
export function scheduleLabel(choice: ScheduleChoice): string | null {
    if (choice.kind === 'described') return null
    if (choice.kind === 'on-demand') return ON_DEMAND_LABEL
    const words = phrase(choice)
    return words.charAt(0).toUpperCase() + words.slice(1)
}

// The agent's first message: the description as typed, then the planner's choice as an instruction.
// A timing the description already states needs no second sentence.
export function buildKickoff(description: string, choice: ScheduleChoice, timeZone: string | null): string {
    const job = description.trim()
    if (choice.kind === 'described') return job
    if (choice.kind === 'on-demand') return `${job}\n\nDo not set up any schedule: only run this when I ask.`
    const zone = timeZone ? ` (${timeZone} time)` : ''
    return `${job}\n\nRun this ${phrase(choice)}${zone}. Set up the schedule yourself.`
}
