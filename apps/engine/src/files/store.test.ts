import { mkdtempSync } from 'node:fs'
import { chmod, lstat, mkdir, readdir, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const dataDir = mkdtempSync(resolve(tmpdir(), 'rerun-store-'))
process.env.RERUN_DATA_DIR = dataDir

const { describe, expect, it } = await import('vitest')
const store = await import('./store.js')

const root = resolve(dataDir, 'root')

describe('files store', () => {
    it('round-trips text and bytes', async () => {
        await store.writeText(root, 'a/b.txt', 'hello')
        expect(await store.readText(root, 'a/b.txt')).toBe('hello')
        await store.writeBytes(root, 'a/c.bin', new Uint8Array([1, 2, 3]))
        expect(Array.from(new Uint8Array(await new Response(store.readByteStream(root, 'a/c.bin')).arrayBuffer()))).toEqual([1, 2, 3])
        expect(await store.fileSize(root, 'a/c.bin')).toBe(3)
    })

    it('lists entries with type and metadata', async () => {
        const entries = await store.listEntries(root, 'a')
        const names = entries.map(e => e.name)
        expect(names).toContain('b.txt')
        expect(entries.find(e => e.name === 'b.txt')?.type).toBe('file')
    })

    it('returns empty list for a missing directory', async () => {
        expect(await store.listEntries(root, 'does-not-exist')).toEqual([])
    })

    it('moves and removes entries', async () => {
        await store.move(root, 'a/b.txt', 'a/renamed.txt')
        expect(await store.readText(root, 'a/renamed.txt')).toBe('hello')
        await store.remove(root, 'a/renamed.txt')
        expect(await store.listEntries(root, 'a')).not.toContainEqual(expect.objectContaining({ name: 'renamed.txt' }))
    })

    it('throws on paths escaping the root', async () => {
        await expect(store.readText(root, '../../etc/passwd')).rejects.toThrow('Path escapes the root')
        await expect(store.writeText(root, '../escape.txt', 'x')).rejects.toThrow('Path escapes the root')
    })

    it('overwrites an existing file without leaving a temp file behind', async () => {
        await store.writeText(root, 'atomic/note.txt', 'first')
        await store.writeText(root, 'atomic/note.txt', 'second')
        expect(await store.readText(root, 'atomic/note.txt')).toBe('second')
        expect(await readdir(resolve(root, 'atomic'))).toEqual(['note.txt'])
    })

    it('keeps the executable bit of an existing file', async () => {
        await store.writeText(root, 'atomic/run.sh', 'echo old')
        await chmod(resolve(root, 'atomic/run.sh'), 0o755)
        await store.writeText(root, 'atomic/run.sh', 'echo new')
        const info = await stat(resolve(root, 'atomic/run.sh'))
        expect(info.mode & 0o111).toBe(0o111)
    })

    it('writes through a symlink instead of replacing it', async () => {
        await mkdir(resolve(root, 'linked'), { recursive: true })
        await writeFile(resolve(root, 'linked/target.txt'), 'old')
        await symlink(resolve(root, 'linked/target.txt'), resolve(root, 'linked/alias.txt'))
        await store.writeText(root, 'linked/alias.txt', 'new')
        expect((await lstat(resolve(root, 'linked/alias.txt'))).isSymbolicLink()).toBe(true)
        expect(await store.readText(root, 'linked/target.txt')).toBe('new')
    })

    it('searches file contents with path:line output', async () => {
        await store.writeText(root, 'src/x.txt', 'nothing\nTODO: fix\n')
        const hits = await store.searchText(root, '.', 'TODO', 50)
        expect(hits.some(h => h.includes('src/x.txt:2:') && h.includes('TODO: fix'))).toBe(true)
    })
})
