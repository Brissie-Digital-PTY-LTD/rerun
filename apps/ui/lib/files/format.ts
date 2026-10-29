export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function formatEta(ms: number): string {
    const seconds = Math.ceil(ms / 1000)
    if (seconds < 60) return `${seconds}s left`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m left`
    return `${Math.floor(minutes / 60)}h left`
}
