'use client'

import { CaptureReviewStep } from './CaptureReviewStep'
import { CaptureSelectStep } from './CaptureSelectStep'
import type { CaptureFlow, CaptureStep } from './useCaptureFlow'

// Titles and bodies live together so the two shells that mount this flow cannot describe the same
// step differently.
export const CAPTURE_STEP_COPY: Record<CaptureStep, { title: string; description: string }> = {
    select: { title: 'Capture coworkers', description: 'Pick the coworkers whose folder should become this template.' },
    review: { title: 'Security review', description: 'Check what each coworker carries, then confirm it before capturing.' },
    done: { title: 'Captured', description: 'The archives are stored and the template now describes these coworkers.' },
}

export function CaptureStepBody({ step, flow }: { step: CaptureStep; flow: CaptureFlow }) {
    if (step === 'select') {
        return (
            <CaptureSelectStep
                spaces={flow.spaces}
                spaceId={flow.spaceId}
                loading={flow.loadingSpaces}
                failed={flow.error !== null}
                onSpaceChange={flow.setSpaceId}
                selectedIds={flow.selectedIds}
                onToggle={flow.toggleAgent}
                onSelectionChange={flow.setSelection}
            />
        )
    }

    if (step === 'review') {
        return (
            <CaptureReviewStep
                plans={flow.plans}
                excluded={flow.excluded}
                approved={flow.approved}
                approvedCount={flow.approvedCount}
                setups={flow.setups}
                onToggleFiles={flow.toggleFiles}
                onApprove={flow.setApproval}
                onSetupChange={flow.setSetup}
            />
        )
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm">
                {flow.plans.length} coworker{flow.plans.length === 1 ? '' : 's'} captured. Their skills, schedules and apps now describe this
                template.
            </p>
            {flow.warnings.map(warning => (
                <p key={warning} className="text-xs text-amber-500">
                    {warning}
                </p>
            ))}
        </div>
    )
}
