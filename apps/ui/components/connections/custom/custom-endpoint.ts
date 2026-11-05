import { CUSTOM_PRESETS, type CustomPreset, type CustomProbeResult } from '@rerun/contracts'

// A server like Together lists hundreds of models: switching them all on would flood every model
// picker. The rest stay one click away in the connection's hidden list.
export const MODELS_ON_AT_CONNECT = 10

// A cloud machine cannot reach the owner's own computer, so the presets that listen there are only
// offered where the engine runs beside it.
export function presetsFor(cloud: boolean): readonly CustomPreset[] {
    return cloud ? CUSTOM_PRESETS.filter(preset => !preset.local) : CUSTOM_PRESETS
}

function hostOf(baseUrl: string): string {
    try {
        return new URL(baseUrl).host
    } catch {
        return baseUrl
    }
}

// What the form says under the button when the endpoint did not take the connection. Null when it did.
export function probeProblemMessage(result: CustomProbeResult, model: string | undefined, cloud: boolean): string | null {
    switch (result.problem) {
        case null:
            return null
        case 'unreachable':
            return cloud ? `Could not reach ${hostOf(result.baseUrl)}. It has to be a public address that answers.` : `Could not reach ${hostOf(result.baseUrl)}. Check the server is running and reachable from the engine.`
        case 'unauthorized':
            return 'The server turned this key down. Check it was copied in full.'
        case 'not_listed':
            return 'This server does not list its models. Type the id of the one to run.'
        case 'model_refused':
            return `The server refused ${model ?? 'this model'}${result.detail ? `: ${result.detail}` : '.'}`
    }
}

export function isHttpUrl(value: string): boolean {
    try {
        return /^https?:$/.test(new URL(value.trim()).protocol)
    } catch {
        return false
    }
}
