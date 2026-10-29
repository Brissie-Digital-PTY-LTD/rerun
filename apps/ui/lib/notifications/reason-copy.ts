import type { NotificationReason } from './routing'

// The line under an inbox row, and the subtitle of an email: why this reached you.
export function reasonSentence(reason: NotificationReason, agentName: string): string {
    switch (reason) {
        case 'mine':
            return 'You started this run'
        case 'participant':
            return 'You are in this conversation'
        case 'followed':
            return `You follow ${agentName}'s scheduled tasks`
        case 'all_activity':
            return `You get all activity from ${agentName}`
        case 'everything':
            return 'You get every run in the workspace'
        case 'workspace':
            return 'This is about your workspace'
    }
}
