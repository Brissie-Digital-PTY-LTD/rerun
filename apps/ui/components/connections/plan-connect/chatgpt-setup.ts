export const CHATGPT_SECURITY_URL = 'https://chatgpt.com/#settings/Security'

export const DEVICE_CODE_SETTING = 'Enable device code authorization for Codex'

export const ADMIN_MESSAGE = `Hi! Could you turn on "Device code authorization for Codex" in our ChatGPT workspace settings? I need it to connect my ChatGPT plan to Rerun.`

// OpenAI refuses the code on its own page while the setting is off, and we only ever see the wait
// go on: past this, the wait is more likely that than a slow user.
export const STUCK_AFTER_MS = 30_000
