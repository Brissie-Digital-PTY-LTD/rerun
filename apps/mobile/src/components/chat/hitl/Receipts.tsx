import { HITL_CANCELLED, type ApprovalDecision, type QuestionAnswer, type ServiceSetupEntry } from '@rerun/contracts'
import { SymbolView } from 'expo-symbols'
import { View } from 'react-native'

import { AppText } from '@/components/ui/AppText'
import { useTheme } from '@/theme/theme'
import { radius, spacing } from '@/theme/tokens'

const CANCELLED_COPY: Record<keyof typeof HITL_CANCELLED, string> = {
    question: 'You skipped the questions',
    service: 'You closed the app setup',
    secret: 'You declined to share the keys',
    mcp: 'You skipped signing in',
    takeover: 'You left the browser to your coworker',
}

function ReceiptCard({ title, count, children }: { title: string; count?: string; children: React.ReactNode }) {
    const theme = useTheme()
    return (
        <View style={{ alignSelf: 'flex-end', width: '86%', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: theme.muted }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
                <AppText variant="caption" medium>
                    {title}
                </AppText>
                {count && (
                    <AppText variant="caption" tone="muted">
                        {count}
                    </AppText>
                )}
            </View>
            {children}
        </View>
    )
}

// The answers sent to a question block, drawn back instead of the text written for the coworker.
export function QuestionReceipt({ answers }: { answers: QuestionAnswer[] }) {
    const theme = useTheme()
    const answered = answers.filter(answer => answer.answers.length > 0 || (answer.attachments?.length ?? 0) > 0).length
    return (
        <ReceiptCard title={answers.length > 1 ? 'Answers' : 'Answer'} count={answers.length > 1 ? `${answered} of ${answers.length} answered` : undefined}>
            {answers.map((answer, index) => (
                <View key={index} style={{ gap: 2 }}>
                    <AppText variant="footnote" tone="muted">
                        {answer.question}
                    </AppText>
                    {answer.answers.length === 0 ? (
                        <AppText variant="body" tone="muted" style={{ fontStyle: 'italic' }}>
                            Skipped
                        </AppText>
                    ) : (
                        answer.answers.map(value => (
                            <View key={value} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                                <SymbolView name="checkmark" size={11} weight="bold" tintColor={theme.foreground} />
                                <AppText variant="body" style={{ flexShrink: 1 }}>
                                    {value}
                                </AppText>
                            </View>
                        ))
                    )}
                </View>
            ))}
        </ReceiptCard>
    )
}

export function CancelledReceipt({ of }: { of: keyof typeof HITL_CANCELLED }) {
    const theme = useTheme()
    return (
        <View style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <SymbolView name="xmark" size={11} weight="semibold" tintColor={theme.mutedForeground} />
            <AppText variant="footnote" tone="muted">
                {CANCELLED_COPY[of]}
            </AppText>
        </View>
    )
}

function Decision({ approved, label }: { approved: boolean; label: string }) {
    const theme = useTheme()
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <SymbolView name={approved ? 'checkmark' : 'xmark'} size={10} weight="bold" tintColor={approved ? theme.foreground : theme.destructive} />
            <AppText variant="caption" medium tone={approved ? 'default' : 'destructive'}>
                {label}
            </AppText>
        </View>
    )
}

function DecidedRow({ text, approved, label, note }: { text: string; approved: boolean; label: string; note?: string }) {
    return (
        <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
                <AppText variant="body" tone={approved ? 'default' : 'muted'} style={{ flexShrink: 1, textDecorationLine: approved ? 'none' : 'line-through' }}>
                    {text}
                </AppText>
                <Decision approved={approved} label={label} />
            </View>
            {note && (
                <AppText variant="footnote" tone="muted">
                    “{note}”
                </AppText>
            )}
        </View>
    )
}

export function ApprovalReceipt({ decisions }: { decisions: Omit<ApprovalDecision, 'detail'>[] }) {
    const approved = decisions.filter(entry => entry.decision === 'approved').length
    return (
        <ReceiptCard title={decisions.length > 1 ? 'Approvals' : 'Approval'} count={decisions.length > 1 ? `${approved} approved, ${decisions.length - approved} not now` : undefined}>
            {decisions.map((entry, index) => (
                <DecidedRow key={index} text={entry.action} approved={entry.decision === 'approved'} label={entry.decision === 'approved' ? 'Approved' : 'Not now'} note={entry.note} />
            ))}
        </ReceiptCard>
    )
}

const SERVICE_STATUS: Record<ServiceSetupEntry['outcome'], { approved: boolean; label: string }> = {
    connected: { approved: true, label: 'Connected' },
    skipped: { approved: false, label: 'Skipped' },
    reset: { approved: false, label: 'Not reconnected' },
    'not-found': { approved: false, label: 'Not found' },
}

function StatusRow({ text, approved, label }: { text: string; approved: boolean; label: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <AppText variant="body" style={{ flexShrink: 1 }}>
                {text}
            </AppText>
            <Decision approved={approved} label={label} />
        </View>
    )
}

export function ServiceReceipt({ entries }: { entries: ServiceSetupEntry[] }) {
    const connected = entries.filter(entry => entry.outcome === 'connected').length
    return (
        <ReceiptCard title="Apps" count={`${connected} of ${entries.length} connected`}>
            {entries.map((entry, index) => (
                <StatusRow key={index} text={entry.replaces ? `${entry.name} (instead of ${entry.replaces})` : entry.name} {...SERVICE_STATUS[entry.outcome]} />
            ))}
        </ReceiptCard>
    )
}

export function SecretReceipt({ entries }: { entries: { key: string; provided: boolean }[] }) {
    const stored = entries.filter(entry => entry.provided).length
    return (
        <ReceiptCard title="Keys" count={`${stored} of ${entries.length} stored`}>
            {entries.map(entry => (
                <StatusRow key={entry.key} text={entry.key} approved={entry.provided} label={entry.provided ? 'Stored' : 'Skipped'} />
            ))}
            <AppText variant="footnote" tone="muted">
                Stored on the Box. The coworker only sees the names.
            </AppText>
        </ReceiptCard>
    )
}

export function McpReceipt({ name }: { name: string }) {
    return (
        <ReceiptCard title="MCP server">
            <StatusRow text={name} approved label="Connected" />
        </ReceiptCard>
    )
}

export function TakeoverReceipt({ url }: { url: string | null }) {
    const theme = useTheme()
    return (
        <View style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '86%' }}>
            <SymbolView name="display" size={11} weight="semibold" tintColor={theme.mutedForeground} />
            <AppText variant="footnote" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                {url ? `You handed the browser back on ${url}` : 'You handed the browser back'}
            </AppText>
        </View>
    )
}
