import { Hono } from 'hono'
import { ENGINE_CAPABILITY_DESKTOP, ENGINE_CAPABILITY_FILES_STREAM, ENGINE_CAPABILITY_FOREMAN_FILES, ENGINE_CAPABILITY_SCHEDULE_RENAME } from '@rerun/contracts'
import { activeAgentCount } from '../../agents/registry.js'
import { activeRunCount, sessionClaimCount } from '../../runtime/run-control.js'
import { buildCommit, processStartedAt } from '../../runtime/build-info.js'
import { DATA_DIR_VERSION } from '../../datadir/migrations.js'
import { readDataVersion } from '../../datadir/version.js'
import { desktopAvailable, desktopViewerCount } from '../../desktop/session.js'

export const healthRoutes = new Hono()

healthRoutes.get('/health', c =>
    c.json({
        status: 'ok',
        activeAgents: activeAgentCount(),
        activeRuns: activeRunCount(),
        // Claims and controllers should move together; a gap between them is a leaked conversation.
        claimedSessions: sessionClaimCount(),
        desktopViewers: desktopViewerCount(),
        capabilities: [ENGINE_CAPABILITY_FILES_STREAM, ENGINE_CAPABILITY_FOREMAN_FILES, ENGINE_CAPABILITY_SCHEDULE_RENAME, ...(desktopAvailable() ? [ENGINE_CAPABILITY_DESKTOP] : [])],
        commit: buildCommit(),
        startedAt: processStartedAt(),
        dataVersion: readDataVersion(),
        dataVersionTarget: DATA_DIR_VERSION,
    }),
)
