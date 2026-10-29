import { mkdtempSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { writeFileAtomic } from './atomic-write.js'

describe('writeFileAtomic', () => {
    it('replaces the content and leaves no temp file', async () => {
        const dir = mkdtempSync(resolve(tmpdir(), 'rerun-atomic-'))
        const path = resolve(dir, 'file.md')
        await writeFile(path, 'old')
        await writeFileAtomic(path, 'new')
        expect(await readFile(path, 'utf8')).toBe('new')
        expect(await readdir(dir)).toEqual(['file.md'])
    })

    // A reader racing the writers sees one whole version or another, never an empty file.
    it('never exposes an empty file to a concurrent reader', async () => {
        const dir = mkdtempSync(resolve(tmpdir(), 'rerun-atomic-'))
        const path = resolve(dir, 'file.md')
        await writeFile(path, 'version-start')
        const seen: string[] = []
        await Promise.all([
            ...Array.from({ length: 30 }, (_, i) => writeFileAtomic(path, `version-${i}`)),
            ...Array.from({ length: 30 }, async () => seen.push(await readFile(path, 'utf8'))),
        ])
        expect(seen.every(content => content.startsWith('version-'))).toBe(true)
        expect(await readdir(dir)).toEqual(['file.md'])
    })

    it('cleans its temp file up when the target cannot be written', async () => {
        const dir = mkdtempSync(resolve(tmpdir(), 'rerun-atomic-'))
        await expect(writeFileAtomic(resolve(dir, 'missing', 'file.md'), 'x')).rejects.toThrow()
        expect(await readdir(dir)).toEqual([])
    })
})
