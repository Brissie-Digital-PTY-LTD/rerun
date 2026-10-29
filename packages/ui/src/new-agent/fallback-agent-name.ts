import { AGENT_NAME_MAX } from './reading'

// Les premiers mots de la phrase, quand le modèle n'a pas répondu. Un nom tronqué se corrige d'un
// clic ; un premier agent qui n'est jamais créé, non.
export function fallbackAgentName(task: string): string {
    return task.trim().split(/\s+/).slice(0, 5).join(' ').slice(0, AGENT_NAME_MAX).trimEnd()
}
