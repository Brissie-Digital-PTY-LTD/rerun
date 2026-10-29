import 'server-only'

import { findWorkspaceEngine } from '@/app/api/_services/workspace-engine.service'
import type { ForemanState } from './phase'
import { foremanSurface, type ForemanSurface } from './surface'

export async function resolveForemanSurface(workspaceId: number, state: Pick<ForemanState, 'phase'>): Promise<ForemanSurface> {
    if (state.phase !== 'companion') return 'onboarding'
    return foremanSurface(state.phase, (await findWorkspaceEngine(workspaceId)) !== null)
}
