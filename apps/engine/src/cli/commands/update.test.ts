import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { vi } from 'vitest'

process.env.RERUN_DATA_DIR = mkdtempSync(resolve(tmpdir(), 'rerun-cli-update-'))
process.env.RERUN_API_KEY = ''

const FAKE_HOME = mkdtempSync(resolve(tmpdir(), 'rerun-cli-update-home-'))

const DROP_CACHES = '/proc/sys/vm/drop_caches'
const CHROMIUM = '/fake/ms-playwright/chromium/chrome'

const state = vi.hoisted(() => ({
    calls: [] as string[],
    spawned: [] as Array<{ line: string; options: unknown }>,
    cwds: [] as (string | undefined)[],
    failing: [] as string[],
    procPresent: false,
    chromium: 'installed' as 'installed' | 'missing' | 'no-path' | 'throws',
    noWorkspace: false,
    desktop: true,
}))

vi.mock('../../config/env.js', async importOriginal => ({ ...(await importOriginal<typeof import('../../config/env.js')>()), desktopEnabled: () => state.desktop }))

vi.mock('node:child_process', () => ({
    execFileSync: (command: string, args: string[], options?: { cwd?: string }) => {
        const line = `${command} ${args.join(' ')}`
        state.calls.push(line)
        state.cwds.push(options?.cwd)
        if (state.failing.some(prefix => line.startsWith(prefix))) throw new Error(`${command} exited with 1`)
        return Buffer.from('')
    },
    spawn: (command: string, args: string[], options: unknown) => {
        state.spawned.push({ line: `${command} ${args.join(' ')}`, options })
        return { unref: () => {} }
    },
}))

vi.mock('node:fs', async importOriginal => {
    const real = await importOriginal<typeof import('node:fs')>()
    const existsSync = (path: string) => {
        if (path === '/proc/sys/vm/drop_caches') return state.procPresent
        if (path === '/fake/ms-playwright/chromium/chrome') return state.chromium === 'installed'
        if (state.noWorkspace && String(path).endsWith('pnpm-workspace.yaml')) return false
        return real.existsSync(path)
    }
    return { ...real, existsSync, default: { ...real, existsSync } }
})

// updateCliTools prunes the Claude releases under the home it runs in: never the developer's own.
vi.mock('node:os', async importOriginal => {
    const real = await importOriginal<typeof import('node:os')>()
    return { ...real, homedir: () => FAKE_HOME, default: { ...real, homedir: () => FAKE_HOME } }
})

vi.mock('patchright', () => ({
    chromium: {
        executablePath: () => {
            if (state.chromium === 'throws') throw new Error('no browsers')
            return state.chromium === 'no-path' ? '' : '/fake/ms-playwright/chromium/chrome'
        },
    },
}))

vi.mock('../../datadir/ladder.js', () => ({
    prepareDataDir: async () => {
        state.calls.push('<prepareDataDir>')
    },
}))

const { afterEach, beforeEach, describe, expect, it } = await import('vitest')
const { installBrowser, installBrowserCommand, installBrowserInBackground, installDesktop, installDesktopInBackground, pruneClaudeVersions, updateCliTools, updateCommand } = await import('./update.js')

const ROOT = resolve(import.meta.dirname, '../../../../..')
const INSTALL_BROWSER = `${process.execPath} ${resolve(import.meta.dirname, '../bin.js')} install-browser`
const INSTALL_DESKTOP = `${process.execPath} ${resolve(import.meta.dirname, '../bin.js')} install-desktop`
const DESKTOP_APT = 'env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends openbox x11vnc xdotool thunar xfce4-terminal adwaita-icon-theme tint2 hsetroot curl maim'
const CODEX = '@openai/codex@^0.156.1'
const CLAUDE_INSTALL = 'sh -c curl -fsSL https://claude.ai/install.sh | bash'
const RETURN_MEMORY = `sync; echo 3 > ${DROP_CACHES}; echo 1 > /proc/sys/vm/compact_memory`

let out = ''

function asUser(uid: number) {
    vi.spyOn(process, 'getuid').mockReturnValue(uid)
}

beforeEach(() => {
    state.calls = []
    state.spawned = []
    state.cwds = []
    state.failing = []
    state.procPresent = false
    state.chromium = 'installed'
    state.noWorkspace = false
    state.desktop = true
    out = ''
    vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
        out += String(chunk)
        return true
    })
    vi.stubEnv('RERUN_SERVICE', undefined)
    asUser(1000)
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
})

describe('updateCommand', () => {
    it('pulls, installs, builds, installs the browser, refreshes the CLIs, migrates and restarts through sudo, in that order', async () => {
        await updateCommand([])

        expect(state.calls).toEqual([
            'git pull --ff-only',
            'pnpm --filter rerun-engine... install --prod=false --frozen-lockfile',
            'pnpm --filter rerun-engine... build',
            INSTALL_BROWSER,
            'sudo -n true',
            `sudo -n npm install -g ${CODEX}`,
            CLAUDE_INSTALL,
            INSTALL_DESKTOP,
            '<prepareDataDir>',
            'command -v systemctl',
            'command -v sudo',
            'sudo systemctl restart rerun',
        ])
        expect(state.cwds.slice(0, 4)).toEqual([ROOT, ROOT, ROOT, ROOT])
        expect(out).toContain('migrated data dir')
        expect(out).toContain('restarted rerun')
        expect(out).toContain('\n$ git pull --ff-only\n')
    })

    it('stops before building or migrating when git pull fails', async () => {
        state.failing = ['git pull']
        await expect(updateCommand([])).rejects.toThrow('git exited with 1')
        expect(state.calls).toEqual(['git pull --ff-only'])
    })

    it('stops when the build fails, before touching the database', async () => {
        state.failing = ['pnpm --filter rerun-engine... build']
        await expect(updateCommand([])).rejects.toThrow()
        expect(state.calls).not.toContain('<prepareDataDir>')
    })

    it('refuses to run outside the monorepo', async () => {
        state.noWorkspace = true
        await expect(updateCommand([])).rejects.toThrow('could not locate monorepo root')
        expect(state.calls).toEqual([])
    })

    it('skips the restart with --no-restart', async () => {
        await updateCommand(['--no-restart'])
        expect(state.calls.at(-1)).toBe('<prepareDataDir>')
        expect(out).toContain('skipping restart (--no-restart)')
    })

    it('tells the user to restart by hand when there is no systemctl', async () => {
        state.failing = ['command -v systemctl']
        await updateCommand([])
        expect(state.calls.at(-1)).toBe('command -v systemctl')
        expect(out).toContain('systemctl not found; restart the engine manually')
        expect(out).not.toContain('restarted')
    })

    it('restarts directly as root', async () => {
        asUser(0)
        await updateCommand([])
        expect(state.calls).toContain(`npm install -g ${CODEX}`)
        expect(state.calls).not.toContain('sudo -n true')
        expect(state.calls).not.toContain('command -v sudo')
        expect(state.calls.at(-1)).toBe('systemctl restart rerun')
    })

    it('restarts directly when sudo is not installed', async () => {
        state.failing = ['command -v sudo', 'sudo -n true']
        await updateCommand([])
        expect(state.calls).toContain(`npm install -g ${CODEX}`)
        expect(state.calls.at(-1)).toBe('systemctl restart rerun')
    })

    it('restarts the service named by RERUN_SERVICE', async () => {
        vi.stubEnv('RERUN_SERVICE', 'rerun-staging')
        await updateCommand([])
        expect(state.calls.at(-1)).toBe('sudo systemctl restart rerun-staging')
        expect(out).toContain('restarted rerun-staging')
    })

    it('carries on when the browser install fails', async () => {
        state.failing = [INSTALL_BROWSER]
        await updateCommand(['--no-restart'])
        expect(out).toContain(`chromium install failed (continuing): ${process.execPath} exited with 1`)
        expect(state.calls).toContain('<prepareDataDir>')
    })

    it('returns the page cache to the host before restarting when /proc allows it', async () => {
        state.procPresent = true
        await updateCommand([])
        const i = state.calls.indexOf(`sudo -n sh -c ${RETURN_MEMORY}`)
        expect(i).toBeGreaterThan(state.calls.indexOf('<prepareDataDir>'))
        expect(i).toBeLessThan(state.calls.indexOf('sudo systemctl restart rerun'))
    })
})

describe('returning memory to the host', () => {
    it('is a no-op without /proc', async () => {
        await updateCommand(['--no-restart'])
        expect(state.calls.some(c => c.includes('drop_caches'))).toBe(false)
        expect(out).not.toContain('memory return')
    })

    it('runs the script directly as root', async () => {
        asUser(0)
        state.procPresent = true
        await updateCommand(['--no-restart'])
        expect(state.calls).toContain(`sh -c ${RETURN_MEMORY}`)
    })

    it('skips it without passwordless sudo', async () => {
        state.procPresent = true
        state.failing = ['sudo -n true']
        await updateCommand(['--no-restart'])
        expect(state.calls.some(c => c.includes('drop_caches'))).toBe(false)
        expect(out).toContain('no passwordless sudo available: skipping memory return')
    })

    it('carries on when the script fails', async () => {
        state.procPresent = true
        state.failing = ['sudo -n sh -c']
        await updateCommand([])
        expect(out).toContain('memory return failed (continuing): sudo exited with 1')
        expect(state.calls.at(-1)).toBe('sudo systemctl restart rerun')
    })
})

describe('installBrowser', () => {
    const DEPS = 'pnpm --filter rerun-engine exec patchright install-deps chromium'
    const INSTALL = 'pnpm --filter rerun-engine exec patchright install --no-shell chromium'

    it('does nothing when chromium is already on disk', async () => {
        await installBrowser('/repo')
        expect(state.calls).toEqual([])
        expect(out).toBe('chromium already installed\n')
    })

    it('installs the system deps directly as root, then the browser', async () => {
        asUser(0)
        state.chromium = 'missing'
        await installBrowser('/repo')
        expect(state.calls).toEqual([DEPS, INSTALL])
        expect(state.cwds).toEqual(['/repo', '/repo'])
    })

    it('installs the system deps through sudo when it can', async () => {
        state.chromium = 'no-path'
        await installBrowser('/repo')
        expect(state.calls).toEqual(['sudo -n true', `sudo -n ${DEPS}`, INSTALL])
    })

    it('skips the system deps without passwordless sudo but still installs the browser', async () => {
        state.chromium = 'throws'
        state.failing = ['sudo -n true']
        await installBrowser('/repo')
        expect(state.calls).toEqual(['sudo -n true', INSTALL])
        expect(out).toContain('no passwordless sudo available: skipping chromium system dependencies')
    })

    it('runs from the monorepo root as a command', async () => {
        state.chromium = 'missing'
        asUser(0)
        await installBrowserCommand()
        expect(state.cwds).toEqual([ROOT, ROOT])
    })
})

describe('installBrowserInBackground', () => {
    it('leaves an installed browser alone', async () => {
        expect(await installBrowserInBackground()).toBe(false)
        expect(state.spawned).toEqual([])
    })

    it('installs a missing browser in a detached child, without blocking on it', async () => {
        state.chromium = 'missing'
        expect(await installBrowserInBackground()).toBe(true)
        expect(state.spawned).toEqual([{ line: INSTALL_BROWSER, options: { stdio: 'ignore', detached: true } }])
        expect(state.calls).toEqual([])
    })
})

describe('installDesktop', () => {
    const onLinux = () => vi.spyOn(process, 'platform', 'get').mockReturnValue('linux')

    it('does nothing off Linux', () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
        installDesktop()
        expect(state.calls).toEqual([])
    })

    it('leaves a box that already has the desktop alone', () => {
        onLinux()
        installDesktop()
        expect(state.calls).toEqual(['command -v apt-get', 'command -v openbox', 'command -v x11vnc', 'command -v xdotool', 'command -v tint2', 'command -v hsetroot', 'command -v maim'])
        expect(out).toContain('desktop already installed')
    })

    it('refreshes the package lists and installs through sudo when a package is missing', () => {
        onLinux()
        state.failing = ['command -v x11vnc']
        installDesktop()
        expect(state.calls.slice(-3)).toEqual(['sudo -n true', 'sudo -n apt-get update -qq', `sudo -n ${DESKTOP_APT}`])
    })

    it('skips without passwordless sudo, and carries on past a failing install', () => {
        onLinux()
        state.failing = ['command -v openbox', 'sudo -n true']
        installDesktop()
        expect(out).toContain('skipping the desktop packages')
        state.calls = []
        state.failing = ['command -v openbox', 'sudo -n apt-get update']
        installDesktop()
        expect(out).toContain('desktop install failed (continuing)')
    })

    it('is started in the background by an engine that boots without it, and only then', () => {
        expect(installDesktopInBackground()).toBe(false)
        onLinux()
        expect(installDesktopInBackground()).toBe(false)
        state.failing = ['command -v openbox']
        expect(installDesktopInBackground()).toBe(true)
        expect(state.spawned).toEqual([{ line: INSTALL_DESKTOP, options: { stdio: 'ignore', detached: true } }])
    })

    it('is left out of a boot and of an update on a box whose desktop is switched off', async () => {
        state.desktop = false
        onLinux()
        state.failing = ['command -v openbox']
        expect(installDesktopInBackground()).toBe(false)
        expect(state.spawned).toEqual([])
        await updateCommand([])
        expect(state.calls).not.toContain(INSTALL_DESKTOP)
    })
})

const CLAUDE_LAUNCHER = resolve(FAKE_HOME, '.local', 'bin', 'claude')

function seedClaudeVersions(names: string[]): string {
    rmSync(resolve(FAKE_HOME, '.local'), { recursive: true, force: true })
    const versions = resolve(FAKE_HOME, '.local', 'share', 'claude', 'versions')
    mkdirSync(versions, { recursive: true })
    mkdirSync(dirname(CLAUDE_LAUNCHER), { recursive: true })
    for (const name of names) writeFileSync(resolve(versions, name), '')
    return versions
}

describe('pruneClaudeVersions', () => {
    it('keeps every release when the launcher does not resolve into the versions folder', () => {
        const versions = seedClaudeVersions(['2.1.289', '2.1.291'])
        writeFileSync(CLAUDE_LAUNCHER, '')
        expect(pruneClaudeVersions()).toEqual([])
        expect(readdirSync(versions)).toEqual(['2.1.289', '2.1.291'])
    })

    it('keeps every release when there is no launcher', () => {
        const versions = seedClaudeVersions(['2.1.289', '2.1.291'])
        expect(pruneClaudeVersions()).toEqual([])
        expect(readdirSync(versions)).toEqual(['2.1.289', '2.1.291'])
    })
})

describe('updateCliTools', () => {
    it('updates Codex without sudo when none is available', () => {
        state.failing = ['sudo -n true']
        updateCliTools()
        expect(state.calls).toEqual(['sudo -n true', `npm install -g ${CODEX}`, CLAUDE_INSTALL])
    })

    it('carries on past a failing Codex update and a failing Claude update', () => {
        state.failing = ['sudo -n npm', 'sh -c curl']
        updateCliTools()
        expect(state.calls).toEqual(['sudo -n true', `sudo -n npm install -g ${CODEX}`, CLAUDE_INSTALL])
        expect(out).toContain('codex CLI update failed (continuing): sudo exited with 1')
        expect(out).toContain('claude CLI update failed (continuing): sh exited with 1')
    })

    it('leaves only the Claude release the launcher points at', () => {
        const versions = seedClaudeVersions(['2.1.289', '2.1.291', '2.1.294'])
        symlinkSync(resolve(versions, '2.1.294'), CLAUDE_LAUNCHER)
        updateCliTools()
        expect(readdirSync(versions)).toEqual(['2.1.294'])
    })

    it('does not stop the update when both CLIs fail', async () => {
        state.failing = ['sudo -n npm', 'sh -c curl']
        await updateCommand(['--no-restart'])
        expect(state.calls).toContain('<prepareDataDir>')
    })
})
