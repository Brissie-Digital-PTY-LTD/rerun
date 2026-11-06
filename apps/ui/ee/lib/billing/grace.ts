// How long a workspace keeps its machine once its access is gone, before the teardown archives it.

// Counted from the `trial_ended` send, or from the trial's end when that notice never went out.
// Short on purpose: every machine kept for a trial that did not convert is one a new signup cannot
// have, and the trial already carried a notice a day and two hours before its end.
export const BOX_DELETION_GRACE_MS = 2 * 60 * 60_000

// Counted from the declined charge itself, for a renewal as for a trial's first payment. A day is
// what it takes to notice a message and reach for another card, and the workspace keeps running
// meanwhile so that paying in time costs no restore.
export const PAYMENT_FAILED_GRACE_MS = 24 * 60 * 60_000
