'use client'

import { motion } from 'motion/react'

import { outOfOfficeShare } from '@/lib/rewind/format'
import { RewindCount } from '../RewindCount'
import { RewindHeadline, RewindReveal, RewindSlideFrame } from '../RewindSlideFrame'
import { useLocalHourly } from '../useLocalHourly'
import type { RewindSlideProps } from './types'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const HOUR_MARKS = [0, 6, 12, 18]
const HOUR_COLUMNS = { gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }
const LEVEL_COLORS = ['rgba(255,255,255,0.06)', 'rgba(183,168,255,0.3)', 'rgba(183,168,255,0.5)', 'rgba(183,168,255,0.75)', 'rgb(183,168,255)']

function activityLevel(runs: number, peak: number): number {
    return runs > 0 ? Math.ceil((runs / peak) * (LEVEL_COLORS.length - 1)) : 0
}

export function ClockSlide({ payload }: RewindSlideProps) {
    const hourly = useLocalHourly(payload.hourly, payload.weekStart)
    const peak = Math.max(1, ...hourly)
    const offHours = outOfOfficeShare(hourly)

    return (
        <RewindSlideFrame
            tone="ink"
            eyebrow="Round the clock"
            visual={
                <>
                    <div className="flex flex-col gap-[3px]">
                        <div className="ml-5 grid gap-[3px] text-[10px] text-white/50" style={HOUR_COLUMNS}>
                            {HOUR_MARKS.map(hour => (
                                <span key={hour} style={{ gridColumn: `${hour + 1} / span 6` }}>
                                    {`${hour}h`}
                                </span>
                            ))}
                        </div>
                        {DAYS.map((label, day) => (
                            <div key={day} className="flex items-center">
                                <span className="w-5 shrink-0 text-[10px] text-white/60">{label}</span>
                                <div className="grid flex-1 gap-[3px]" style={HOUR_COLUMNS}>
                                    {HOURS.map(hour => (
                                        <motion.div
                                            key={hour}
                                            className="aspect-square rounded-[3px]"
                                            style={{ background: LEVEL_COLORS[activityLevel(hourly[day * 24 + hour], peak)] }}
                                            initial={{ opacity: 0, scale: 0.4 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.3, delay: 0.9 + hour * 0.03 + day * 0.02 }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <RewindReveal delay={1.9} className="mt-2.5 flex items-center justify-end gap-[3px] text-[10px] text-white/50">
                        <span className="mr-1">Less</span>
                        {LEVEL_COLORS.map(color => (
                            <span key={color} className="size-2.5 rounded-[3px]" style={{ background: color }} />
                        ))}
                        <span className="ml-1">More</span>
                    </RewindReveal>
                </>
            }
        >
            <RewindHeadline>
                <RewindCount value={offHours} delay={0.4} suffix="%" /> of the work
                <br />
                happened while you were off.
            </RewindHeadline>
            <RewindReveal delay={0.8} className="mt-2 text-sm text-white/70">
                Nights, early mornings and weekends included.
            </RewindReveal>
        </RewindSlideFrame>
    )
}
