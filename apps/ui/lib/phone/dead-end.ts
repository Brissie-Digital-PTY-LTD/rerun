// No other code would get this number through: Bird turned it away, or another account holds it.
const DEAD_END_REASONS = new Set(['undeliverable', 'blocked', 'taken'])

export const isDeadEndReason = (reason: string | undefined) => !!reason && DEAD_END_REASONS.has(reason)
