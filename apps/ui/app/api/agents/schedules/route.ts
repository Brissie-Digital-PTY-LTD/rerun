import { requireWorkspaceId } from '@/app/api/_auth/ownership'
import { listWorkspaceSchedules } from '@/app/api/_services/workspace-schedules.service'

// What the board counts down to. A route for the same reason as the health poll beside it: a server
// action would queue in front of everything the panel asks for.
export async function GET(): Promise<Response> {
    let workspaceId: number
    try {
        workspaceId = await requireWorkspaceId()
    } catch {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return Response.json(await listWorkspaceSchedules(workspaceId))
}
