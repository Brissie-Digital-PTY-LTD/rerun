import { toast } from 'sonner'

const UPDATE_TOAST_ID = 'deploy-update'

export function showUpdateAvailableToast() {
    toast('New version available', {
        id: UPDATE_TOAST_ID,
        description: 'Reload to get the latest Rerun.',
        duration: Infinity,
        action: { label: 'Reload', onClick: () => window.location.reload() },
    })
}

export function dismissUpdateAvailableToast() {
    toast.dismiss(UPDATE_TOAST_ID)
}
