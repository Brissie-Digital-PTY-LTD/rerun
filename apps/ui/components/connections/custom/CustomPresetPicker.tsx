'use client'

import { Field } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CustomPreset } from '@rerun/contracts'

const OTHER = 'other'

type CustomPresetPickerProps = {
    id: string
    presets: readonly CustomPreset[]
    selected: CustomPreset['id'] | null
    onPick: (preset: CustomPreset | null) => void
}

// Picking one fills in what it already knows: its name and its address.
export function CustomPresetPicker({ id, presets, selected, onPick }: CustomPresetPickerProps) {
    const pick = (value: string) => onPick(presets.find(preset => preset.id === value) ?? null)

    return (
        <Field label="Server" htmlFor={id}>
            <Select value={selected ?? OTHER} onValueChange={pick}>
                <SelectTrigger id={id} className="h-8 w-full text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {presets.map(preset => (
                        <SelectItem key={preset.id} value={preset.id}>
                            {preset.label}
                        </SelectItem>
                    ))}
                    <SelectItem value={OTHER}>Other</SelectItem>
                </SelectContent>
            </Select>
        </Field>
    )
}
