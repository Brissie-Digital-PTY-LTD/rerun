#!/usr/bin/env node
// Installs the private `cloud/` workspace after the root install, when it is in the checkout. Its
// packages link to the dependencies of apps/ui, so it has to come second. A checkout without it (an
// open source clone) has nothing to do, and neither has an install that left the app out (a Docker
// stage or a CI job filtered to one package): the Dockerfiles install cloud/ on their own.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CLOUD_DIR = join(REPO_ROOT, 'cloud')
const APP_INSTALLED = existsSync(join(REPO_ROOT, 'apps/ui/node_modules'))

if (APP_INSTALLED && existsSync(join(CLOUD_DIR, 'pnpm-workspace.yaml'))) {
    const result = spawnSync('pnpm', ['install', '--frozen-lockfile'], { cwd: CLOUD_DIR, stdio: 'inherit' })
    process.exit(result.status ?? 1)
}
