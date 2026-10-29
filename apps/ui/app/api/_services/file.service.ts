import * as engine from '@/lib/engine/client'
import type { EngineConnection } from '@/lib/engine/types'
import { hashText, looksBinary } from '@/lib/files/editable'
import { MAX_TEXT_WRITE_CHARS } from '@rerun/contracts'

export type SaveFileResult = { success: true } | { success: false; error: string; conflict?: true }

export const FILE_CHANGED_ERROR = 'This file changed on the Box since you opened it.'

// The one place a workspace file is written from the panel, shared by agent files and Box files.
// The two server actions above it only resolve which engine and which base to talk to.
export async function saveTextFile(conn: EngineConnection, base: string, filePath: string, content: string, baseHash: string | null): Promise<SaveFileResult> {
    if (content.length > MAX_TEXT_WRITE_CHARS) {
        return { success: false, error: `This file is over ${MAX_TEXT_WRITE_CHARS.toLocaleString('en-US')} characters and cannot be saved from here.` }
    }
    if (looksBinary(content)) {
        return { success: false, error: 'This file is not text, so saving it here would corrupt it.' }
    }

    // An agent can be running against the same workspace, so what is on disk is re-read and matched
    // against what the editor started from. The window is narrow rather than closed: the engine has
    // no compare-and-swap, and adding one would break on the Boxes still running an older build.
    if (baseHash !== null) {
        const current = await engine.readFileText(conn, base, filePath).catch(() => null)
        if (current && hashText(current.content) !== baseHash) {
            return { success: false, error: FILE_CHANGED_ERROR, conflict: true }
        }
    }

    try {
        await engine.writeFileText(conn, base, filePath, content)
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to save this file' }
    }
}
