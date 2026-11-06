'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { setRerunCreditPausedAction } from '@/ee/actions/billing.actions'
import { Field } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'

// On by default. Off, the hub refuses every Rerun model and paid data call, so nothing is spent until
// a member turns it back on. The workspace row follows over realtime, the switch only holds the click.
export function RerunCreditSwitch({ paused }: { paused: boolean }) {
    const [optimistic, setOptimistic] = useState<boolean | null>(null)
    const [saving, setSaving] = useState(false)
    const on = optimistic ?? !paused

    useEffect(() => setOptimistic(null), [paused])

    async function toggle(next: boolean) {
        setOptimistic(next)
        setSaving(true)
        const result = await setRerunCreditPausedAction(!next)
        setSaving(false)
        if (result.ok) return
        setOptimistic(null)
        toast.error(result.error)
    }

    return (
        <Field orientation="row" label="Allow spending" helperText={on ? 'Coworkers can use Rerun models and paid data.' : "Paused. Coworkers can't use Rerun models or paid data."} className="flex-1">
            <Switch checked={on} disabled={saving} onCheckedChange={toggle} />
        </Field>
    )
}
