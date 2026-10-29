'use client'

import { ChromeBar, ChromeButton, ChromeDivider } from './chrome/ChromeSurface'
import { TooltipLabeled } from './Tooltip'
import { cn } from './cn'
import { FocusCenterIcon, MinusIcon, PlusIcon } from './icons'

export type CanvasViewControlsPlacement = 'bottom-right' | 'top-right'

type CanvasViewControlsProps = {
    onZoomIn: () => void
    onZoomOut: () => void
    onRecenter: () => void
    placement?: CanvasViewControlsPlacement
    className?: string
}

// Assise sur l'inset de la bannière de consentement (0px sans bannière), comme les sheets : en
// mobile elle est `fixed bottom-0` et recouvrirait la moitié de la pill. En haut, rien à éviter.
const PLACEMENT: Record<CanvasViewControlsPlacement, string> = {
    'bottom-right': 'bottom-[calc(1rem+var(--consent-inset))] right-4',
    'top-right': 'top-4 right-4',
}

// Pill verticale (zoom in / zoom out / recentrer) partagée par l'iso board et le dashboard.
// Même design que ModeSwitcher/WorkspaceSwitcher (beam non animé) ; tooltips instantanés (delay 0).
export function CanvasViewControls({ onZoomIn, onZoomOut, onRecenter, placement = 'bottom-right', className }: CanvasViewControlsProps) {
    return (
        <ChromeBar orientation="vertical" className={cn('absolute z-40', PLACEMENT[placement], className)}>
            <TooltipLabeled label="Zoom in" side="left">
                <ChromeButton aria-label="Zoom in" icon={PlusIcon} onPointerDown={e => e.stopPropagation()} onClick={onZoomIn} />
            </TooltipLabeled>
            <TooltipLabeled label="Zoom out" side="left">
                <ChromeButton aria-label="Zoom out" icon={MinusIcon} onPointerDown={e => e.stopPropagation()} onClick={onZoomOut} />
            </TooltipLabeled>
            <ChromeDivider orientation="horizontal" />
            <TooltipLabeled label="Recenter" side="left">
                <ChromeButton aria-label="Recenter view" icon={FocusCenterIcon} onPointerDown={e => e.stopPropagation()} onClick={onRecenter} />
            </TooltipLabeled>
        </ChromeBar>
    )
}
