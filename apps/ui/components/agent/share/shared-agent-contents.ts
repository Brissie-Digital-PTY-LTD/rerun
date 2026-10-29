import type { AgentSharePreview } from '@rerun/contracts'
import type { AgentCardEntry, AgentCardNotes } from '@/components/templates/TemplateDetailAgentCard'
import { BoxIcon, BrainIcon, DatabaseIcon, FileTextIcon, KeyIcon, PlugIcon } from '@/lib/icons'

// What the recipient gets, and what stays on them, told inside the agent card rather than in a box
// of its own underneath: these are properties of this copy, on the same footing as its skills.
export function sharedAgentCardProps(preview: AgentSharePreview): { comesWith: AgentCardEntry[]; notes: AgentCardNotes } {
    const { include, contents } = preview

    const comesWith: AgentCardEntry[] = [
        include.memories && contents.memories.count > 0
            ? { key: 'memories', icon: BrainIcon, title: plural(contents.memories.count, 'memory', 'memories'), subtitle: 'Everything it has learned so far' }
            : null,
        include.database && contents.database.count > 0 ? { key: 'database', icon: DatabaseIcon, title: 'Its database', subtitle: 'Its own tables, rows included' } : null,
        include.files && contents.files.count > 0 ? { key: 'files', icon: FileTextIcon, title: plural(contents.files.count, 'workspace file', 'workspace files') } : null,
        preview.envKeyCount > 0 ? { key: 'keys', icon: KeyIcon, title: plural(preview.envKeyCount, 'API key', 'API keys'), subtitle: 'Yours to fill in' } : null,
        preview.mcpAuthCount > 0
            ? { key: 'mcp-auth', icon: PlugIcon, title: plural(preview.mcpAuthCount, 'service to sign in again', 'services to sign in again'), subtitle: 'On your own accounts' }
            : null,
    ].filter((entry): entry is AgentCardEntry => entry !== null)

    return {
        // An empty section would read as an omission rather than as an answer, and "no data" is the
        // most reassuring thing this card can say to someone opening a stranger's link.
        comesWith: comesWith.length > 0 ? comesWith : [{ key: 'agent-only', icon: BoxIcon, title: 'Just the coworker', subtitle: 'No data travels with it' }],
        notes: {
            connectors: preview.connectors.length > 0 ? 'You will connect these with your own accounts.' : undefined,
            triggers: preview.agent.triggers.length > 0 ? 'Each one gets a new URL of its own.' : undefined,
        },
    }
}

function plural(count: number, one: string, many: string) {
    return `${count} ${count === 1 ? one : many}`
}
