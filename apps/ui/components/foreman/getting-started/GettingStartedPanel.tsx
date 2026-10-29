'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Gauge } from '@/components/ui/gauge'
import { Icon } from '@/components/ui/icon'
import { IconBadge } from '@/components/ui/icon-badge'
import { TooltipLabeled } from '@/components/ui/tooltip'
import { ProviderIcon } from '@/lib/engine/provider-icons'
import { ArrowRightIcon, CheckIcon, EyeOffIcon, TrophyIcon } from '@/lib/icons'
import { doneCount, GETTING_STARTED_REWARD_DAYS, nextStep, stepsOf, type GettingStartedProgress, type GettingStartedReward as Reward, type GettingStartedStep } from '@/lib/onboarding/getting-started'
import { cn } from '@/lib/utils'

export type OnGettingStartedStep = (step: GettingStartedStep) => void

const SPRING = { type: 'spring', stiffness: 520, damping: 26 } as const
const PROGRESS_GRADIENT = ['var(--brand)', 'color-mix(in oklab, var(--brand), white 20%)'] as const

export function GettingStartedProgressMark({ progress, className }: { progress: GettingStartedProgress; className?: string }) {
    const done = doneCount(progress)
    const total = stepsOf(progress).length
    if (done === total) return <IconBadge tone="green" icon={CheckIcon} className={className} />
    return <Gauge ratio={done / total} gradient={PROGRESS_GRADIENT} className={cn('size-5 text-brand', className)} />
}

export function GettingStartedHeader({ progress, onHide, className }: { progress: GettingStartedProgress; onHide?: () => void; className?: string }) {
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <span className="text-base font-medium">Getting started</span>
            <span className="flex items-center gap-1.5">
                <GettingStartedProgressMark progress={progress} />
                <span className="text-xs text-muted-foreground tabular-nums">
                    {doneCount(progress)}/{stepsOf(progress).length}
                </span>
            </span>
            {onHide && (
                <TooltipLabeled label="Hide">
                    <Button variant="ghost" size="icon-sm" onClick={onHide} aria-label="Hide" className="-my-1 ml-auto text-muted-foreground">
                        <EyeOffIcon />
                    </Button>
                </TooltipLabeled>
            )}
        </div>
    )
}

function StepRow({ step, done, highlighted, onStep }: { step: GettingStartedStep; done: boolean; highlighted: boolean; onStep: OnGettingStartedStep }) {
    return (
        <li>
            <button
                type="button"
                disabled={done}
                onClick={() => onStep(step)}
                className={cn(
                    'group flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                    done ? 'cursor-default' : 'hover:bg-accent',
                    highlighted && 'bg-muted/60'
                )}
            >
                <span className="pt-px">{done ? <IconBadge tone="green" icon={CheckIcon} /> : <IconBadge tone="neutral" glow={false} />}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('truncate text-sm transition-colors duration-300', done ? 'text-muted-foreground line-through decoration-muted-foreground/60' : 'font-medium text-foreground')}>{step.title}</span>
                    {!done && <span className="text-xs text-muted-foreground">{step.description}</span>}
                    {!done && step.providers && (
                        <span className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                            {step.providers.map(provider => (
                                <ProviderIcon key={provider} provider={provider} className="size-3.5" />
                            ))}
                        </span>
                    )}
                </span>
                {!done && <ArrowRightIcon className={cn('mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-opacity', highlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />}
            </button>
        </li>
    )
}

export function GettingStartedList({ progress, onStep, className }: { progress: GettingStartedProgress; onStep: OnGettingStartedStep; className?: string }) {
    const next = nextStep(progress)
    return (
        <ul className={cn('flex flex-col gap-0.5', className)}>
            {stepsOf(progress).map(step => (
                <StepRow key={step.id} step={step} done={!!progress[step.id]} highlighted={next?.id === step.id} onStep={onStep} />
            ))}
        </ul>
    )
}

function Celebration({ title, description, className }: { title: string; description: string; className?: string }) {
    const reducedMotion = useReducedMotion()
    return (
        <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 6 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : SPRING}
            className={cn('flex items-center gap-3 rounded-lg border border-border px-3 py-2.5', className)}
        >
            <motion.span initial={reducedMotion ? false : { rotate: -18, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={reducedMotion ? { duration: 0 } : { ...SPRING, delay: 0.12 }} className="flex">
                <Icon icon={TrophyIcon} size="sm" tone="brand" />
            </motion.span>
            <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{title}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
            </span>
        </motion.div>
    )
}

function RewardNote({ title, description, className }: { title: string; description: string; className?: string }) {
    return (
        <motion.div key={title} exit={{ opacity: 0 }} className={cn('flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5', className)}>
            <Icon icon={TrophyIcon} size="sm" />
            <span className="flex flex-col gap-0.5">
                <span className="text-xs font-medium">{title}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
            </span>
        </motion.div>
    )
}

/**
 * What finishing is worth. Only a trial wins days; a paid plan finishes on a plain "all set", and
 * has nothing dangled in front of it on the way.
 */
export function GettingStartedReward({ progress, reward, className }: { progress: GettingStartedProgress; reward: Reward; className?: string }) {
    const total = stepsOf(progress).length
    const remaining = total - doneCount(progress)

    let content: ReactNode = null
    if (reward === 'granted') content = <Celebration key="granted" title={`${GETTING_STARTED_REWARD_DAYS} days added to your trial`} description="Your workspace is all set. Enjoy the extra time." className={className} />
    else if (remaining === 0 && reward === 'available') content = <RewardNote key="claiming" title={`Adding ${GETTING_STARTED_REWARD_DAYS} days to your trial`} description="One moment." className={className} />
    else if (remaining === 0) content = <Celebration key="done" title="Your workspace is all set" description="Your coworkers can run on their own now." className={className} />
    else if (reward === 'available')
        content = (
            <RewardNote
                key="locked"
                title={`Get ${GETTING_STARTED_REWARD_DAYS} more free trial days`}
                description={`Complete the ${total} steps above. ${remaining} to go.`}
                className={className}
            />
        )

    return (
        <AnimatePresence mode="wait" initial={false}>
            {content}
        </AnimatePresence>
    )
}

type GettingStartedPanelProps = { progress: GettingStartedProgress; reward: Reward; onStep: OnGettingStartedStep; onHide?: () => void; className?: string }

export function GettingStartedPanel({ progress, reward, onStep, onHide, className }: GettingStartedPanelProps) {
    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <GettingStartedHeader progress={progress} onHide={onHide} />
            <GettingStartedList progress={progress} onStep={onStep} />
            <GettingStartedReward progress={progress} reward={reward} />
        </div>
    )
}
