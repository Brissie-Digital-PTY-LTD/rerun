import { UNPLACED_COL } from '@/lib/board/iso'
import type { Tables } from '@/app/api/database.types'

export const AGENT_COLUMNS = ['id', 'name', 'handle', 'description', 'space_id', 'col', 'row', 'disabled_at'] as const
export const SPACE_COLUMNS = ['id', 'name', 'col_start', 'row_start', 'col_end', 'row_end'] as const

export type ForemanAgentRow = Pick<Tables<'agents'>, (typeof AGENT_COLUMNS)[number]>
export type ForemanSpaceRow = Pick<Tables<'spaces'>, (typeof SPACE_COLUMNS)[number]>

// The board as text, handed over on every turn. Without it the agent opens each conversation with
// list_spaces then list_agents before it can answer "how many agents do I have", and the tile
// coordinates it needs to move anything are in no tool at all.
//
// What each coworker is doing is left out: written once per turn, it is stale before the turn ends
// and was wrong outright for a run the board had not swept yet. get_team_status reads it live.
//
// The rows are read once by the phase resolver, which needs the same two tables to know where the
// workspace stands, and rendered here.
//
// This block sits last in the system prompt, which is the strongest position in it, so an empty board
// has to say what the phase allows rather than what the schema allows. Offering a Box to someone who
// cannot be given create_boxes is how the foreman ends up announcing one it never made.
export function renderBoardMap(spaces: ForemanSpaceRow[], agents: ForemanAgentRow[], { canCreateBox }: { canCreateBox: boolean }): string {
    if (!spaces.length) {
        return canCreateBox
            ? 'This workspace has no Box yet, so it cannot hold a coworker. Lay the divisions of their company out with create_boxes, all of them in a single call, the one they will spend their week in first: it lands at the centre and the others are laid around its faces.'
            : 'This workspace has no Box yet, so it holds nothing at all: no coworker, no skill, no schedule. Nothing can be created at this stage of the conversation. Do not offer a Box, do not claim one exists, and do not describe a team as if it had been built.'
    }

    return spaces
        .map(space => {
            const inside = agents.filter(agent => agent.space_id === space.id)
            const header = `Box "${space.name ?? 'Box'}" (id ${space.id}), cells col ${space.col_start}-${space.col_end}, row ${space.row_start}-${space.row_end}`
            if (!inside.length) return `${header}\n  (empty)`
            const lines = inside.map(agent => {
                const where = agent.col === UNPLACED_COL ? 'not placed on the board' : `col ${agent.col}, row ${agent.row}`
                const switchedOff = agent.disabled_at ? ' switched off,' : ''
                return `  - ${agent.name} (@${agent.handle ?? '?'}, id ${agent.id})${switchedOff} ${where}${agent.description ? ` - ${agent.description}` : ''}`
            })
            return `${header}\n${lines.join('\n')}`
        })
        .join('\n\n')
}
