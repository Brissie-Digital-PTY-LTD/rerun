import { resolve, relative, isAbsolute, sep } from 'node:path'
import { workspaceDir } from '../config/paths.js'

export function resolveWithin(root: string, path: string): string {
    const target = isAbsolute(path) ? path : resolve(root, path)
    const rel = relative(root, target)
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`Path escapes the root: ${path}`)
    return target
}

export function resolveInWorkspace(agentId: string, path: string): string {
    return resolveWithin(workspaceDir(agentId), path)
}

const BLOCKED = [/\brm\s+-rf\s+\/(?:\s|$)/, /\bmkfs\b/, /\b(shutdown|halt|poweroff|kexec)\b/, /\b(?:tel)?init\s+[06]\b/, /sysrq-trigger/, /\bdd\s+if=/, /:\(\)\s*\{/, /\bchown\s+-R\s+\//]

export function assertCommandAllowed(command: string): void {
    for (const pattern of BLOCKED) {
        if (pattern.test(command)) throw new Error(`Command blocked by policy: ${command}`)
    }
}
