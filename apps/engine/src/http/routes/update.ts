import { spawn } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'
import { resolve } from 'node:path'
import { Hono } from 'hono'
import { activeRunCount } from '../../runtime/run-control.js'
import { desktopViewerCount } from '../../desktop/session.js'
import { activeTakeovers } from '../../desktop/takeover.js'
import { buildCommit } from '../../runtime/build-info.js'
import { dataDir } from '../../config/paths.js'
import { logger } from '../../lib/logger.js'

export const updateRoutes = new Hono()

let updating = false

// Self-update: spawn a detached `rerun update` (git pull → build → migrate → restart). The
// child stays in the systemd cgroup but the build finishes before it triggers the restart,
// and the restart job is owned by systemd (PID 1), so the engine comes back on the new build
// even though the child is killed by that very restart. Refuses while a run is in flight.
updateRoutes.post('/', async c => {
    const { force } = await c.req.json().catch(() => ({})) as { force?: boolean }
    const activeRuns = activeRunCount()
    // A restart would cut the screen of whoever is signing in for an agent right now.
    if (!force && (activeRuns > 0 || desktopViewerCount() > 0 || activeTakeovers().length > 0)) return c.json({ started: false, reason: 'busy', activeRuns })
    if (updating) return c.json({ started: false, reason: 'already-updating' })
    updating = true

    const logFd = openSync(resolve(dataDir(), 'update.log'), 'a')
    const child = spawn(process.execPath, [process.argv[1]!, 'update'], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        env: { ...process.env, CI: 'true' },
    })
    child.on('error', err => {
        updating = false
        logger.error({ err: String(err) }, 'failed to spawn engine self-update')
    })
    child.unref()
    closeSync(logFd)

    logger.info({ commit: buildCommit() }, 'engine self-update started')
    return c.json({ started: true, commit: buildCommit() }, 202)
})
