// The open source build of what `cloud/` holds for Rerun Cloud: no paid data, no Rewind.
import type { Hono } from 'hono'
import type { ToolSet } from 'ai'

import type { RunContext } from '../runtime/context.js'

export const PAID_DATA_ENABLED = false

export function paidDataTools(_ctx: RunContext): ToolSet {
    return {}
}

export function mountCloudRoutes(_api: Hono): void {}
