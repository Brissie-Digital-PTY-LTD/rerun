'use client'

import { ScrollFade } from '@rerun/ui/primitives'
import type { RevenueRange } from '@/ee/services/creator-revenue.service'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ExternalLinkIcon, WalletIcon } from '@/lib/icons'
import { useCreatorStore } from '@/stores/creator.store'
import { cn } from '@/lib/utils'
import { CreatorRevenuePanelSkeleton } from './CreatorRevenuePanelSkeleton'
import { RevenueChart } from './RevenueChart'
import { RevenueSalesTable } from './RevenueSalesTable'
import { RevenueStatTiles } from './RevenueStatTiles'
import { useCreatorPayouts } from './useCreatorPayouts'
import { useCreatorRevenue } from './useCreatorRevenue'

const RANGES: { value: RevenueRange; label: string }[] = [
    { value: '30d', label: '30 days' },
    { value: '12m', label: '12 months' },
    { value: 'all', label: 'All time' },
]

// What Rerun can answer that Stripe cannot: revenue per template. Everything else, payout history
// included, is one login link away in the Express dashboard.
export function CreatorRevenuePanel({ active }: { active: boolean }) {
    const { revenue, range, changeRange } = useCreatorRevenue(active)
    const { account, pending, openDashboard } = useCreatorPayouts(active)
    const setPane = useCreatorStore(state => state.setPane)

    if (account !== null && account.state === 'not_started') {
        return (
            <EmptyState
                icon={WalletIcon}
                title="No payouts account yet"
                description="Set up payouts to start selling your templates."
                action={
                    <Button type="button" size="sm" onClick={() => setPane({ kind: 'payouts' })}>
                        Set up payouts
                    </Button>
                }
            />
        )
    }

    if (revenue === null) return <CreatorRevenuePanelSkeleton />

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 pt-5">
                <h3 className="text-base font-medium">Revenue</h3>
                <div className="flex items-center gap-1">
                    {RANGES.map(option => (
                        <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-pressed={range === option.value}
                            onClick={() => changeRange(option.value)}
                            className={cn('text-xs', range === option.value && 'bg-accent text-foreground')}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            <ScrollFade className="min-h-0 flex-1 px-5 pb-5">
                <div className="flex flex-col gap-5 pt-5">
                    <RevenueStatTiles revenue={revenue} />
                    <RevenueChart revenue={revenue} />
                    <RevenueSalesTable revenue={revenue} />

                    <div className="flex">
                        <Button type="button" size="sm" variant="outline" loading={pending === 'dashboard'} onClick={openDashboard}>
                            <ExternalLinkIcon className="size-3.5" />
                            Open Stripe dashboard
                        </Button>
                    </div>
                </div>
            </ScrollFade>
        </div>
    )
}
