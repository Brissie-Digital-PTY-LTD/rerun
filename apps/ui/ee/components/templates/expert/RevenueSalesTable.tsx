'use client'

import { formatAmount } from '@rerun/contracts'
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@rerun/ui/primitives'
import type { CreatorRevenue } from '@/ee/services/creator-revenue.service'
import { saleKindLabel, saleKindTone } from '@/ee/lib/templates/payouts'

function dateLabel(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RevenueSalesTable({ revenue }: { revenue: CreatorRevenue }) {
    if (revenue.recent.length === 0) return null

    return (
        <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recent sales</p>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">You earned</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {revenue.recent.map(sale => (
                        <TableRow key={sale.id}>
                            <TableCell className="whitespace-nowrap text-muted-foreground">{dateLabel(sale.occurredAt)}</TableCell>
                            <TableCell className="max-w-40 truncate">{sale.title}</TableCell>
                            <TableCell>
                                <Badge tone={saleKindTone(sale.kind)} size="xs" glow={false} className="font-medium">
                                    {saleKindLabel(sale.kind)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatAmount(sale.netCents, revenue.currency)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
