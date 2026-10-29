'use client'

import { AgentCombobox } from '@/components/agent/AgentCombobox'
import { DIALOG_TABS_CONTENT, DIALOG_TABS_HEADER, DialogTabs } from '@/components/dialogs/DialogTabs'
import { CoworkerNotificationSettings } from '@/components/notifications/settings/CoworkerNotificationSettings'
import { AccountEmails } from '@/components/notifications/settings/NotificationChannels'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs'
import { useBoardStore } from '@/stores/board.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useMemo, useState } from 'react'

type NotificationTab = 'coworkers' | 'account'

const TABS = [
    { value: 'coworkers', label: 'Coworkers' },
    { value: 'account', label: 'Account' },
] as const

const TAB_DESCRIPTIONS: Record<NotificationTab, string> = {
    coworkers: 'What is worth interrupting you for. Saved as you go.',
    account: 'Choose which account emails you receive.',
}

// The sheet's own safe-area padding is dropped by the p-0 of DIALOG_TABS_CONTENT, so the scrolling
// body carries it itself.
const TAB_BODY = 'flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6'

export function NotificationsDialog() {
    const open = useNotificationsStore(s => s.open)
    const setOpen = useNotificationsStore(s => s.setOpen)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className={DIALOG_TABS_CONTENT}>
                <NotificationsDialogBody />
            </DialogContent>
        </Dialog>
    )
}

function NotificationsDialogBody() {
    const targetAgentId = useNotificationsStore(s => s.targetAgentId)
    const agents = useBoardStore(s => s.agents)
    const { prefs, update, setCoworkerRule } = useNotificationPrefs()
    const [activeTab, setActiveTab] = useState<NotificationTab>('coworkers')

    const coworkers = useMemo(() => agents.map(agent => ({ id: agent.id, name: agent.name })), [agents])

    return (
        <DialogTabs
            tabs={TABS}
            tab={activeTab}
            onTabChange={setActiveTab}
            header={
                <DialogHeader className={DIALOG_TABS_HEADER}>
                    <DialogTitle>Notifications</DialogTitle>
                    <DialogDescription>{TAB_DESCRIPTIONS[activeTab]}</DialogDescription>
                </DialogHeader>
            }
        >
            {activeTab === 'coworkers' && (
                <div className={TAB_BODY}>
                    <CoworkerNotificationSettings
                        prefs={prefs}
                        coworkers={coworkers}
                        onUpdate={update}
                        onSetCoworkerRule={setCoworkerRule}
                        pinnedCoworkerId={targetAgentId}
                        renderPicker={({ exclude, onPick }) => <AgentCombobox value={undefined} onChange={onPick} exclude={exclude} placeholder="Choose a coworker" className="w-full" />}
                    />
                </div>
            )}

            {activeTab === 'account' && (
                <div className={TAB_BODY}>
                    <AccountEmails categories={prefs.categories} onChange={(category, value) => update({ categories: { [category]: value } })} />
                </div>
            )}
        </DialogTabs>
    )
}
