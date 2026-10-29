'use client'

import * as React from 'react'
import { useForm, useWatch, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Building2, Star, UserRoundIcon, type LucideIcon } from '../icons'

import { BorderBeam } from '../BorderBeam'
import { cn } from '../cn'
import { Form, FormControl, FormField, FormItem, FormMessage, Input, MultiSelect, Select } from '../forms'
import { Button, Icon, ScrollFade } from '../primitives'
import { RichTextEditor } from '../rich-text-editor'
import { Field } from '../forms'
import { StepTransition, StepperBar, useStepper } from '../steps'
import { ExpertImageFields } from './ExpertImageFields'
import { ExpertProfilePreview } from './ExpertProfilePreview'
import { availabilityDot, availabilityHint, availabilityLabel, badgeFromType, BUDGET_OPTIONS, LANGUAGE_OPTIONS, SKILL_OPTIONS } from './options'
import { EXPERT_AVAILABILITIES, EXPERT_TYPES, editExpertSchema, type EditExpertValues } from './schema'
import { initialsFromName, type Expert, type ExpertUpload, type OwnerExpert } from './types'

const TYPE_META: Record<(typeof EXPERT_TYPES)[number], { icon: LucideIcon; title: string; desc: string }> = {
    studio: { icon: Building2, title: 'Studio', desc: 'An agency or team building for clients' },
    freelancer: { icon: UserRoundIcon, title: 'Freelancer', desc: 'An independent building solo' },
    expert: { icon: Star, title: 'Expert', desc: 'A specialist offering advice and guidance' },
}

// "Expert" is an admin-only badge; profiles pick between Freelancer and Studio here.
const SELECTABLE_TYPES = ['freelancer', 'studio'] as const satisfies readonly (typeof EXPERT_TYPES)[number][]

const STEPS = ['identity', 'about', 'pricing', 'expertise', 'links'] as const
type StepName = (typeof STEPS)[number]

const STEP_TITLES: Record<StepName, string> = {
    identity: 'Your identity',
    about: 'About you',
    pricing: 'Rates & availability',
    expertise: 'Your expertise',
    links: 'Links & publish',
}

const STEP_SUBS: Record<StepName, string> = {
    identity: 'Your photo, banner, name and how you work.',
    about: 'Where you are and what you do.',
    pricing: 'Your availability and a sense of your rates.',
    expertise: 'The skills and languages you work with. Optional.',
    links: 'Add your links, then publish your profile.',
}

const STEP_FIELDS: Record<StepName, Path<EditExpertValues>[]> = {
    identity: ['name', 'type', 'email'],
    about: ['location', 'bio'],
    pricing: ['availability', 'budget'],
    expertise: ['skills', 'languages'],
    links: ['x_url', 'linkedin_url', 'github_url', 'website_url'],
}

export type ExpertProfileSubmitResult = { ok: true } | { ok: false; error: string }

interface ExpertProfileWizardProps {
    expert: OwnerExpert
    bannerOptions: readonly string[]
    uploadAvatar: ExpertUpload
    uploadBanner: ExpertUpload
    onSubmit: (values: EditExpertValues) => Promise<ExpertProfileSubmitResult>
    submitLabel: string
    submittingLabel: string
    previewAction?: React.ReactNode
}

function toDefaults(expert: OwnerExpert): EditExpertValues {
    return {
        name: expert.name,
        type: expert.type,
        email: expert.email ?? '',
        location: expert.location ?? '',
        bio: expert.bio ?? '',
        availability: expert.availability,
        budget: expert.budget ?? '',
        avatar_url: expert.avatarUrl ?? '',
        banner_url: expert.bannerUrl,
        skills: expert.skills,
        languages: expert.languages,
        x_url: expert.xUrl ?? '',
        linkedin_url: expert.linkedinUrl ?? '',
        github_url: expert.githubUrl ?? '',
        website_url: expert.websiteUrl ?? '',
    }
}

export function toExpertPreview(expert: Expert, values: EditExpertValues): Expert {
    return {
        ...expert,
        name: values.name || expert.name,
        type: values.type,
        badge: badgeFromType(values.type),
        location: values.location || null,
        bio: values.bio || null,
        availability: values.availability,
        budget: values.budget || null,
        avatarUrl: values.avatar_url || null,
        bannerUrl: values.banner_url || expert.bannerUrl,
        initials: initialsFromName(values.name || expert.name),
        skills: values.skills,
        languages: values.languages,
        xUrl: values.x_url || null,
        linkedinUrl: values.linkedin_url || null,
        githubUrl: values.github_url || null,
        websiteUrl: values.website_url || null,
    }
}

export function ExpertProfileWizard({ expert, bannerOptions, uploadAvatar, uploadBanner, onSubmit, submitLabel, submittingLabel, previewAction }: ExpertProfileWizardProps) {
    const [error, setError] = React.useState<string | null>(null)

    const form = useForm<EditExpertValues>({
        resolver: zodResolver(editExpertSchema),
        defaultValues: toDefaults(expert),
    })

    const { index, direction, goForward, back, isFirst, isLast } = useStepper(STEPS.length)
    const step = STEPS[index]

    const values = useWatch({ control: form.control }) as EditExpertValues
    const preview = toExpertPreview(expert, values)

    // Continue is disabled on the identity step until a name and an email are entered; every other
    // field is optional, so the remaining steps advance freely.
    const canNext = step !== 'identity' || ((values.name ?? '').trim().length > 0 && (values.email ?? '').trim().length > 0)

    const submit = form.handleSubmit(async submitted => {
        setError(null)
        const result = await onSubmit(submitted)
        if (!result.ok) setError(result.error)
    })

    // Single submit path: Enter or the primary button either advances (validating the current step's
    // fields first) or, on the last step, submits.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isLast) {
            await submit()
            return
        }
        if (await form.trigger(STEP_FIELDS[step])) goForward()
    }

    return (
        // Below sm the preview is gone and the dialog is a bottom sheet: no height of its own,
        // or the sheet keeps its full height under an open keyboard and buries the footer.
        <div className="flex min-h-0 flex-col sm:grid sm:h-[min(36rem,88dvh)] sm:grid-cols-2">
            <Form {...form}>
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-col p-4 sm:p-6">
                    <StepperBar count={STEPS.length} current={index} className="mb-6" />

                    <div className="mb-4 flex flex-col gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{`Step ${index + 1}`}</p>
                        <StepTransition stepKey={step} direction={direction} variant="header" className="grid gap-1">
                            <h2 className="font-heading text-base leading-none font-medium">{STEP_TITLES[step]}</h2>
                            <p className="text-sm text-muted-foreground">{STEP_SUBS[step]}</p>
                        </StepTransition>
                    </div>

                    <ScrollFade className="-mx-1 -mt-1 min-h-0 flex-1 px-1 pb-6 pt-1">
                        <StepTransition stepKey={step} direction={direction} className="space-y-4">
                            {step === 'identity' && (
                                <>
                                    <ExpertImageFields
                                        initials={preview.initials}
                                        badge={preview.badge}
                                        avatarUrl={values.avatar_url}
                                        bannerUrl={values.banner_url}
                                        bannerOptions={bannerOptions}
                                        uploadAvatar={uploadAvatar}
                                        uploadBanner={uploadBanner}
                                        onAvatarChange={url => form.setValue('avatar_url', url, { shouldDirty: true })}
                                        onBannerChange={url => form.setValue('banner_url', url, { shouldDirty: true })}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input label="Name" placeholder="e.g. Mira Labs" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        label="Email"
                                                        type="email"
                                                        placeholder="you@studio.com"
                                                        helperText="Private. Only the Rerun team can see it."
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <span className="text-xs font-medium text-muted-foreground">Type</span>
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    {SELECTABLE_TYPES.map(type => (
                                                        <TypeOptionCard
                                                            key={type}
                                                            icon={TYPE_META[type].icon}
                                                            title={TYPE_META[type].title}
                                                            desc={TYPE_META[type].desc}
                                                            selected={field.value === type}
                                                            onClick={() => field.onChange(type)}
                                                        />
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {step === 'about' && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input label="Location" optional placeholder="e.g. Paris" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="bio"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Field label="Bio" optional>
                                                    <RichTextEditor
                                                        placeholder="What you build and who you help."
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                    />
                                                </Field>
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {step === 'pricing' && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="availability"
                                        render={({ field }) => (
                                            <FormItem>
                                                <span className="text-xs font-medium text-muted-foreground">Availability</span>
                                                <div className="grid gap-2">
                                                    {EXPERT_AVAILABILITIES.map(value => (
                                                        <AvailabilityOptionCard
                                                            key={value}
                                                            value={value}
                                                            title={availabilityLabel(value)}
                                                            desc={availabilityHint(value)}
                                                            selected={field.value === value}
                                                            onClick={() => field.onChange(value)}
                                                        />
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="budget"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Select label="Budget" optional options={BUDGET_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Select a range" />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {step === 'expertise' && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="skills"
                                        render={({ field }) => (
                                            <FormItem>
                                                <MultiSelect label="Skills" optional options={SKILL_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Select skills" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="languages"
                                        render={({ field }) => (
                                            <FormItem>
                                                <MultiSelect label="Languages" optional options={LANGUAGE_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Select languages" />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {step === 'links' && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="x_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input label="X" optional placeholder="https://x.com/…" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="linkedin_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input label="LinkedIn" optional placeholder="https://linkedin.com/in/…" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="github_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input label="GitHub" optional placeholder="https://github.com/…" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="website_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input label="Website" optional placeholder="https://rerun.build" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </StepTransition>
                    </ScrollFade>

                    {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

                    <div className="-mx-4 -mb-4 mt-auto flex flex-row gap-2 border-t bg-muted/50 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:-mx-6 sm:-mb-6 sm:justify-end sm:px-6 sm:pb-4">
                        {!isFirst && (
                            <Button type="button" variant="outline" size="icon" onClick={back} aria-label="Back" className="sm:w-auto sm:px-2.5">
                                <ArrowLeft className="sm:hidden" />
                                <span className="hidden sm:inline">Back</span>
                            </Button>
                        )}
                        {isLast ? (
                            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1 sm:flex-none">
                                {form.formState.isSubmitting ? submittingLabel : submitLabel}
                            </Button>
                        ) : (
                            <Button type="submit" disabled={!canNext} className="flex-1 sm:flex-none">
                                Continue
                            </Button>
                        )}
                    </div>
                </form>
            </Form>

            <div className="hidden min-h-0 border-l bg-muted/30 sm:block">
                <ExpertProfilePreview expert={preview} action={previewAction} />
            </div>
        </div>
    )
}

function AvailabilityOptionCard({ value, title, desc, selected, onClick }: { value: (typeof EXPERT_AVAILABILITIES)[number]; title: string; desc: string; selected: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={cn('relative flex w-full items-center gap-2.5 rounded-lg border p-3 text-left transition-colors', selected ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50')}>
            {selected && <BorderBeam animated pattern="arcs" tone="white" glow />}
            <span className={cn('size-2 shrink-0 rounded-full', availabilityDot(value))} />
            <span className="min-w-0">
                <span className="block text-sm font-medium">{title}</span>
                <span className="block text-xs text-muted-foreground">{desc}</span>
            </span>
        </button>
    )
}

function TypeOptionCard({ icon, title, desc, selected, onClick }: { icon: LucideIcon; title: string; desc: string; selected: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={cn('relative flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-colors', selected ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50')}>
            {selected && <BorderBeam animated pattern="arcs" tone="white" glow />}
            <Icon icon={icon} size="sm" />
            <span className="min-w-0">
                <span className="block text-sm font-medium">{title}</span>
                <span className="block text-xs text-muted-foreground">{desc}</span>
            </span>
        </button>
    )
}
