'use client'

import { DialogTabs } from '@/components/dialogs/DialogTabs'
import type { AccountTab } from '@/stores/account.store'
import type { ReactNode } from 'react'

export const ACCOUNT_TABS: Record<AccountTab, { label: string; description: string }> = {
    profile: { label: 'Profile', description: 'Your photo and your name, as your teammates see them.' },
    'sign-in': { label: 'Sign-in', description: 'The ways you can sign into this account.' },
    delete: { label: 'Delete account', description: 'Close your Rerun account for good.' },
}

const TABS = [
    { value: 'profile', label: ACCOUNT_TABS.profile.label },
    { value: 'sign-in', label: ACCOUNT_TABS['sign-in'].label },
    { value: 'delete', label: ACCOUNT_TABS.delete.label },
] as const

export function AccountTabs(props: { tab: AccountTab; onTabChange: (tab: AccountTab) => void; header: ReactNode; children: ReactNode }) {
    return <DialogTabs tabs={TABS} {...props} />
}
