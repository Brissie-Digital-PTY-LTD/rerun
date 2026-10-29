import { pendingApprovals, pendingMcpSignIn, pendingQuestions, pendingSecrets, pendingServices, type HitlKind } from './chat-hitl.js'

const counted = (count: number, one: string, many: string) => (count > 1 ? `${count} ${many}` : one)

// What the scroll cue says is waiting at the end of the thread, once the block is out of sight. Each
// client draws its own glyph beside it.
export function pendingHitlLabel(kind: HitlKind, input: Record<string, unknown>): string {
    switch (kind) {
        case 'question':
            return counted(pendingQuestions(input).length, 'Question waiting', 'questions waiting')
        case 'approval':
            return counted(pendingApprovals(input).length, 'Approval needed', 'approvals needed')
        case 'secret':
            return counted(pendingSecrets(input).length, 'Credential needed', 'credentials needed')
        case 'mcp': {
            const { name } = pendingMcpSignIn(input)
            return name ? `Sign in to ${name}` : 'Sign-in needed'
        }
        case 'service':
            return counted(pendingServices(input).length, 'App to connect', 'apps to connect')
        case 'takeover':
            return 'Your turn on the screen'
    }
}

export type ScrollCue = 'pill' | 'arrow' | null

// While a block waits, the round arrow never shows: once the block is in sight it would sit right
// on its buttons, the thread having been unstuck to bring a tall block in by its top. Nor does the pill
// at the bottom: a block just mounted reads out of sight while the thread is still following it in.
export function scrollCueOf({ pending, pendingInView, atBottom }: { pending: boolean; pendingInView: boolean; atBottom: boolean }): ScrollCue {
    if (pending) return pendingInView || atBottom ? null : 'pill'
    return atBottom ? null : 'arrow'
}
