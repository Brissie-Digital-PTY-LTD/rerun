import * as SecureStore from 'expo-secure-store'
import { useEffect, useState } from 'react'

export type GroupMode = 'recent' | 'box'

const GROUP_KEY = 'rerun.home-group'

// How the home lists the coworkers, kept on the device from one launch to the next.
export function useGroupMode(): [GroupMode, (mode: GroupMode) => void] {
    const [mode, setMode] = useState<GroupMode>('recent')

    useEffect(() => {
        SecureStore.getItemAsync(GROUP_KEY).then(stored => {
            if (stored === 'box') setMode(stored)
        })
    }, [])

    const choose = (next: GroupMode) => {
        setMode(next)
        SecureStore.setItemAsync(GROUP_KEY, next)
    }

    return [mode, choose]
}
