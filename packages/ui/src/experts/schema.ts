import { z } from 'zod'

import { BUDGET_OPTIONS, EXPERT_AVAILABILITIES, EXPERT_TYPES, LANGUAGE_OPTIONS, SKILL_OPTIONS } from './options'

// Owner-facing schema: what an expert may edit about their own fiche, from the landing claim link or
// from the app. No React here, so both apps' server actions re-parse it at their boundary.
export { EXPERT_AVAILABILITIES, EXPERT_TYPES } from './options'

const budgetValues: readonly string[] = BUDGET_OPTIONS
const skillValues: readonly string[] = SKILL_OPTIONS
const languageValues: readonly string[] = LANGUAGE_OPTIONS

export const editExpertSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Name is required')
        .max(80, 'Name is too long')
        .refine(value => !/[<>]/.test(value), 'Name cannot contain < or >'),
    type: z.enum(EXPERT_TYPES),
    email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
    location: z.string().trim(),
    bio: z.string().trim().max(4000, 'Bio is too long'),
    availability: z.enum(EXPERT_AVAILABILITIES),
    budget: z.string().trim().refine(value => value === '' || budgetValues.includes(value), 'Invalid budget'),
    avatar_url: z.string().trim(),
    banner_url: z.string().trim(),
    skills: z.array(z.string()).refine(values => values.every(value => skillValues.includes(value)), 'Invalid skill'),
    languages: z.array(z.string()).refine(values => values.every(value => languageValues.includes(value)), 'Invalid language'),
    x_url: z.string().trim(),
    linkedin_url: z.string().trim(),
    github_url: z.string().trim(),
    website_url: z.string().trim(),
})

export type EditExpertValues = z.infer<typeof editExpertSchema>
