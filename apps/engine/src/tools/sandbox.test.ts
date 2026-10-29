import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

process.env.RERUN_DATA_DIR = mkdtempSync(resolve(tmpdir(), 'rerun-sandbox-'))

const { describe, expect, it } = await import('vitest')
const { assertCommandAllowed, resolveInWorkspace, resolveWithin } = await import('./sandbox.js')
const { workspaceDir } = await import('../config/paths.js')

const root = '/data/agents/a1/workspace'

describe('resolveWithin', () => {
    it.each([
        ['', root],
        ['.', root],
        ['notes.md', `${root}/notes.md`],
        ['a/../b.md', `${root}/b.md`],
        ['..notes.md', `${root}/..notes.md`],
        ['dir/..hidden/x', `${root}/dir/..hidden/x`],
        [`${root}/deep/file.txt`, `${root}/deep/file.txt`],
    ])('resolves %j inside the root', (path, expected) => {
        expect(resolveWithin(root, path)).toBe(expected)
    })

    it.each(['..', '../x', 'a/../../x', '/etc/passwd', '/data/agents/a1/workspace-other/x', '/data/agents/a1/.env'])('refuses %j', path => {
        expect(() => resolveWithin(root, path)).toThrow(`Path escapes the root: ${path}`)
    })
})

describe('resolveInWorkspace', () => {
    it('anchors on the agent workspace', () => {
        expect(resolveInWorkspace('a1', 'x.md')).toBe(resolve(workspaceDir('a1'), 'x.md'))
        expect(() => resolveInWorkspace('a1', '../.env')).toThrow(/escapes the root/)
    })
})

describe('assertCommandAllowed', () => {
    it.each(['rm -rf /', 'sudo rm -rf / ', 'mkfs.ext4 /dev/sda1', 'shutdown -h now', 'halt', 'sudo poweroff', 'systemctl poweroff', 'sudo systemctl kexec', 'init 0', 'telinit 6', 'echo o > /proc/sysrq-trigger', 'dd if=/dev/zero of=/dev/sda', ':(){ :|:& };:', 'chown -R / nobody'])('blocks %j', command => {
        expect(() => assertCommandAllowed(command)).toThrow(`Command blocked by policy: ${command}`)
    })

    it.each(['ls -la', 'rm -rf ./build', 'rm -rf /tmp/scratch', 'npm run build', 'git status', 'curl -s https://example.com', 'sudo reboot'])('allows %j', command => {
        expect(() => assertCommandAllowed(command)).not.toThrow()
    })

    // A best-effort denylist, not a boundary: these are pinned so a change to it is deliberate.
    it.each(['rm -fr /', 'rm -r -f /', 'rm -rf /*', 'dd of=/dev/sda if=/dev/zero'])('does not catch the rewritten form %j', command => {
        expect(() => assertCommandAllowed(command)).not.toThrow()
    })

    it('blocks any command merely mentioning a power verb', () => {
        expect(() => assertCommandAllowed('cat shutdown.txt')).toThrow(/blocked by policy/)
    })
})
