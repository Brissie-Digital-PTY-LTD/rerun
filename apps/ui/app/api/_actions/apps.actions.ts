'use server'

import { z } from 'zod'
import { paidAppFlag } from '@rerun/cloud/apps.server'
import { requireLightSessionActor } from '@/app/api/_auth/access'
import { requireAdminContext } from '@/app/api/_auth/ownership'
import {
    AppActionError,
    addAppSlot,
    attachAgentToConnection,
    cancelAppConnect,
    connectLinkedin,
    connectWhatsapp,
    detachAgent,
    disconnectConnection,
    getAgentAppBinding,
    getAppsOverview,
    resendAppCode,
    setAgentWakeEvents,
    submitAppCheckpoint,
    type AgentAppBinding,
    type AppsOverview,
    type ConnectOutcome,
} from '@/app/api/_services/apps.service'
import { markAppAuthorized } from '@/app/api/_services/services.service'
import { appInfo } from '@/lib/apps/catalog'
import type { LinkupLinkCode } from '@/lib/apps/linkup/client'
import { APP_SLUGS, type AppSlug } from '@/lib/apps/types'

type Result<T> = { ok: true; value: T } | { ok: false; error: string; code?: AppActionError['code'] }

// A paid app moves money and logs into somebody's account: hiding the button is not enough, every
// action checks the app's flag on the server, the way template purchases check theirs.
async function run<T>(slug: AppSlug, fallback: string, body: () => Promise<T>): Promise<Result<T>> {
    try {
        const app = appSlug.parse(slug)
        if (!(await paidAppFlag(app))) throw new AppActionError(`${appInfo(app).name} is not available yet.`, 'not_entitled')
        return { ok: true, value: await body() }
    } catch (err) {
        if (err instanceof AppActionError) return { ok: false, error: err.message, code: err.code }
        if (err instanceof z.ZodError) return { ok: false, error: 'Check the fields and try again.' }
        console.error(`[apps] ${fallback}`, err)
        return { ok: false, error: err instanceof Error ? err.message : fallback }
    }
}

// Slots are billed and accounts are the workspace's: an admin adds and links them, a coworker's
// binding to an account stays with whoever configures the coworker.
async function runAsAdmin<T>(slug: AppSlug, fallback: string, body: () => Promise<T>): Promise<Result<T>> {
    return run(slug, fallback, async () => {
        await requireAdminContext('Only an admin can manage paid apps')
        return body()
    })
}

const appSlug = z.enum(APP_SLUGS)
const id = z.string().uuid()
const country = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/)

const linkedinConnectSchema = z.union([
    z.object({ connectionId: id.optional(), country, email: z.string().trim().email().max(320), password: z.string().min(1).max(500) }),
    z.object({ connectionId: id.optional(), country, loginToken: z.string().trim().min(10).max(4000) }),
])

export async function getAppsOverviewAction(slug: AppSlug): Promise<Result<AppsOverview>> {
    return run(slug, 'Could not load your apps', () => getAppsOverview(slug))
}

// `requestId` is minted by the button, once per click: a retry of the same click is folded into one
// charge, a new click is a new slot.
export async function addAppSlotAction(slug: AppSlug, requestId: string): Promise<Result<{ trialSlot: boolean }>> {
    return runAsAdmin(slug, 'Could not add a slot', () => addAppSlot(slug, id.parse(requestId)))
}

// The password goes to Linkup and nowhere else: it is neither stored nor logged here.
export async function connectLinkedinAction(input: z.input<typeof linkedinConnectSchema>): Promise<Result<ConnectOutcome>> {
    return runAsAdmin('linkedin', 'Could not connect LinkedIn', () => connectLinkedin(linkedinConnectSchema.parse(input)))
}

// E.164: a plus, a country code that never starts with 0, then digits.
const whatsappConnectSchema = z.object({ connectionId: id.optional(), phoneNumber: z.string().trim().regex(/^\+[1-9]\d{6,14}$/), pairingCode: z.boolean() })

export async function connectWhatsappAction(input: z.input<typeof whatsappConnectSchema>): Promise<Result<ConnectOutcome>> {
    return runAsAdmin('whatsapp', 'Could not link WhatsApp', () => connectWhatsapp(whatsappConnectSchema.parse(input)))
}

export async function submitAppCheckpointAction(slug: AppSlug, connectionId: string, code?: string): Promise<Result<ConnectOutcome>> {
    return runAsAdmin(slug, 'Could not verify the code', () => submitAppCheckpoint(slug, id.parse(connectionId), z.string().trim().max(20).optional().parse(code)))
}

export async function resendAppCodeAction(slug: AppSlug, connectionId: string): Promise<Result<LinkupLinkCode | null>> {
    return runAsAdmin(slug, 'Could not send a new code', () => resendAppCode(slug, id.parse(connectionId)))
}

export async function cancelAppConnectAction(slug: AppSlug, connectionId: string): Promise<Result<null>> {
    return runAsAdmin(slug, 'Could not cancel', async () => {
        await cancelAppConnect(slug, id.parse(connectionId))
        return null
    })
}

export async function disconnectAppConnectionAction(slug: AppSlug, connectionId: string): Promise<Result<null>> {
    return runAsAdmin(slug, 'Could not disconnect this account', async () => {
        await disconnectConnection(slug, id.parse(connectionId))
        return null
    })
}

export async function getAgentAppBindingAction(slug: AppSlug, agentId: string): Promise<Result<AgentAppBinding>> {
    return run(slug, 'Could not load this coworker’s account', () => getAgentAppBinding(slug, id.parse(agentId)))
}

// Picking the account is the coworker's whole sign-in for a paid app: its service goes active here.
export async function attachAgentToConnectionAction(slug: AppSlug, agentId: string, connectionId: string): Promise<Result<null>> {
    return run(slug, 'Could not attach this account', async () => {
        const actor = await requireLightSessionActor()
        await attachAgentToConnection(slug, id.parse(agentId), id.parse(connectionId))
        const binding = await getAgentAppBinding(slug, agentId)
        await markAppAuthorized(agentId, appInfo(slug).serviceSlug, binding?.label ?? undefined, actor)
        return null
    })
}

export async function detachAgentAction(slug: AppSlug, agentId: string): Promise<Result<null>> {
    return run(slug, 'Could not detach this account', async () => {
        await detachAgent(slug, id.parse(agentId))
        return null
    })
}

export async function setAgentWakeEventsAction(slug: AppSlug, agentId: string, events: string[]): Promise<Result<null>> {
    return run(slug, 'Could not save the events', async () => {
        await setAgentWakeEvents(slug, id.parse(agentId), z.array(z.string()).max(10).parse(events))
        return null
    })
}
