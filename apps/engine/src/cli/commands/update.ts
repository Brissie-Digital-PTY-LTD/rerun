import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareDataDir } from '../../datadir/ladder.js'
import { desktopEnabled } from '../../config/env.js'

const CLI_ENTRY = fileURLToPath(new URL('../bin.js', import.meta.url))

function monorepoRoot(): string {
    let dir = dirname(fileURLToPath(import.meta.url))
    while (dir !== dirname(dir)) {
        if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir
        dir = dirname(dir)
    }
    throw new Error('could not locate monorepo root (no pnpm-workspace.yaml found)')
}

function run(command: string, args: string[], cwd?: string): void {
    process.stdout.write(`\n$ ${command} ${args.join(' ')}\n`)
    execFileSync(command, args, { stdio: 'inherit', cwd })
}

function hasCommand(command: string): boolean {
    try {
        execFileSync('command', ['-v', command], { stdio: 'ignore', shell: '/bin/sh' })
        return true
    } catch {
        return false
    }
}

function canSudo(): boolean {
    try {
        execFileSync('sudo', ['-n', 'true'], { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

async function browserInstalled(): Promise<boolean> {
    try {
        const { chromium } = await import('patchright')
        const executable = chromium.executablePath()
        return !!executable && existsSync(executable)
    } catch {
        return false
    }
}

export async function installBrowser(root: string): Promise<void> {
    if (await browserInstalled()) {
        process.stdout.write('chromium already installed\n')
        return
    }
    if (process.getuid?.() === 0) {
        run('pnpm', ['--filter', 'rerun-engine', 'exec', 'patchright', 'install-deps', 'chromium'], root)
    } else if (canSudo()) {
        run('sudo', ['-n', 'pnpm', '--filter', 'rerun-engine', 'exec', 'patchright', 'install-deps', 'chromium'], root)
    } else {
        process.stdout.write('no passwordless sudo available: skipping chromium system dependencies (the browser may fail to launch)\n')
    }
    run('pnpm', ['--filter', 'rerun-engine', 'exec', 'patchright', 'install', '--no-shell', 'chromium'], root)
}

const DESKTOP_PACKAGES = ['openbox', 'x11vnc', 'xdotool', 'thunar', 'xfce4-terminal', 'adwaita-icon-theme', 'tint2', 'hsetroot', 'curl', 'maim']

// The dock, the wallpaper and the screen capture are checked too, so a box that got its desktop before they existed installs them.
const desktopInstalled = (): boolean => ['openbox', 'x11vnc', 'xdotool', 'tint2', 'hsetroot', 'maim'].every(hasCommand)

const desktopInstallable = (): boolean => process.platform === 'linux' && hasCommand('apt-get')

// Kept in step with the list in scripts/install.sh, which only ever runs when a box is born.
export function installDesktop(): void {
    if (!desktopInstallable()) return
    if (desktopInstalled()) {
        process.stdout.write('desktop already installed\n')
        return
    }
    const root = process.getuid?.() === 0
    if (!root && !canSudo()) {
        process.stdout.write('no passwordless sudo available: skipping the desktop packages\n')
        return
    }
    const asRoot = (command: string[]) => (root ? run(command[0]!, command.slice(1)) : run('sudo', ['-n', ...command]))
    try {
        // A box that has not installed anything since it was born holds package lists that point at versions the mirror dropped.
        asRoot(['apt-get', 'update', '-qq'])
        asRoot(['env', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', 'install', '-y', '-qq', '--no-install-recommends', ...DESKTOP_PACKAGES])
    } catch (err) {
        process.stdout.write(`desktop install failed (continuing): ${err instanceof Error ? err.message : String(err)}\n`)
    }
}

// Same reason as the browser below: the update that brought this build in ran the previous
// release's updater, which had never heard of these packages.
export function installDesktopInBackground(): boolean {
    if (!desktopEnabled() || !desktopInstallable() || desktopInstalled()) return false
    spawn(process.execPath, [CLI_ENTRY, 'install-desktop'], { stdio: 'ignore', detached: true }).unref()
    return true
}

// An engine can come up without the browser its build expects: the updater that installed it ran
// the previous release's code, which knew another package. A child process keeps the server
// answering during the ~170 MB download.
export async function installBrowserInBackground(): Promise<boolean> {
    if (await browserInstalled()) return false
    spawn(process.execPath, [CLI_ENTRY, 'install-browser'], { stdio: 'ignore', detached: true }).unref()
    return true
}

export async function installBrowserCommand(): Promise<void> {
    await installBrowser(monorepoRoot())
}

// Kept in step with the pin in scripts/install.sh. The subscription providers are only ever as
// capable as the CLI behind them: GPT-6.1 Sol and Terra need Codex 0.159.1, Haiku 5.5 needs Claude
// Code 2.1.293.
const CODEX_PACKAGE = '@openai/codex@^0.159.1'

// install.sh puts both CLIs on the box once, at birth, and nothing moved them since. An engine that
// self-updates into a catalog naming newer models would offer them against a client that has never
// heard of them, so the refresh belongs here. Both steps are best-effort: a box that cannot reach
// npm still gets its engine update, it just keeps the CLI it had.
export function updateCliTools(): void {
    const sudo = process.getuid?.() !== 0 && canSudo()
    try {
        if (sudo) run('sudo', ['-n', 'npm', 'install', '-g', CODEX_PACKAGE])
        else run('npm', ['install', '-g', CODEX_PACKAGE])
    } catch (err) {
        process.stdout.write(`codex CLI update failed (continuing): ${err instanceof Error ? err.message : String(err)}\n`)
    }
    try {
        run('sh', ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'])
    } catch (err) {
        process.stdout.write(`claude CLI update failed (continuing): ${err instanceof Error ? err.message : String(err)}\n`)
    }
    try {
        pruneClaudeVersions()
    } catch (err) {
        process.stdout.write(`claude CLI cleanup failed (continuing): ${err instanceof Error ? err.message : String(err)}\n`)
    }
}

// The installer drops each release beside the last one, ~250 MB apiece, and only repoints the
// launcher. A launcher that does not resolve into the versions folder leaves everything in place.
export function pruneClaudeVersions(home = homedir()): string[] {
    const versions = resolve(home, '.local', 'share', 'claude', 'versions')
    const launcher = resolve(home, '.local', 'bin', 'claude')
    if (!existsSync(versions) || !existsSync(launcher)) return []
    const current = realpathSync(launcher)
    if (dirname(current) !== realpathSync(versions)) return []
    const stale = readdirSync(versions).filter(name => name !== basename(current))
    for (const name of stale) rmSync(resolve(versions, name), { recursive: true, force: true })
    return stale
}

const DROP_CACHES = '/proc/sys/vm/drop_caches'
const RETURN_MEMORY_SCRIPT = `sync; echo 3 > ${DROP_CACHES}; echo 1 > /proc/sys/vm/compact_memory`

// A build leaves ~5 GiB of page cache in the VM, and the host only gets it back once the guest
// frees it. The image's return-memory timer does that every 10 min and skips busy boxes, so a
// fleet-wide update outran it and swapped a host until it stopped answering. Freeing it here,
// before the restart, hands it back before the update queue moves on to the next box.
function returnMemoryToHost(): void {
    if (!existsSync(DROP_CACHES)) return
    try {
        if (process.getuid?.() === 0) run('sh', ['-c', RETURN_MEMORY_SCRIPT])
        else if (canSudo()) run('sudo', ['-n', 'sh', '-c', RETURN_MEMORY_SCRIPT])
        else process.stdout.write('no passwordless sudo available: skipping memory return\n')
    } catch (err) {
        process.stdout.write(`memory return failed (continuing): ${err instanceof Error ? err.message : String(err)}\n`)
    }
}

export async function updateCommand(args: string[]): Promise<void> {
    const noRestart = args.includes('--no-restart')
    const root = monorepoRoot()
    const service = process.env.RERUN_SERVICE ?? 'rerun'

    run('git', ['pull', '--ff-only'], root)
    run('pnpm', ['--filter', 'rerun-engine...', 'install', '--prod=false', '--frozen-lockfile'], root)
    run('pnpm', ['--filter', 'rerun-engine...', 'build'], root)

    // Through the freshly built CLI: this process still runs the code it started with, and the new
    // build may expect another browser than the one it knows how to install.
    try {
        run(process.execPath, [CLI_ENTRY, 'install-browser'], root)
    } catch (err) {
        process.stdout.write(`chromium install failed (continuing): ${err instanceof Error ? err.message : String(err)}\n`)
    }

    updateCliTools()
    if (desktopEnabled()) {
        try {
            run(process.execPath, [CLI_ENTRY, 'install-desktop'], root)
        } catch (err) {
            process.stdout.write(`desktop install failed (continuing): ${err instanceof Error ? err.message : String(err)}\n`)
        }
    }

    await prepareDataDir()
    process.stdout.write('migrated data dir\n')

    returnMemoryToHost()

    if (noRestart) {
        process.stdout.write('skipping restart (--no-restart)\n')
        return
    }
    if (!hasCommand('systemctl')) {
        process.stdout.write('systemctl not found; restart the engine manually to load the new build\n')
        return
    }
    const useSudo = process.getuid?.() !== 0 && hasCommand('sudo')
    run(useSudo ? 'sudo' : 'systemctl', useSudo ? ['systemctl', 'restart', service] : ['restart', service])
    process.stdout.write(`restarted ${service}\n`)
}
