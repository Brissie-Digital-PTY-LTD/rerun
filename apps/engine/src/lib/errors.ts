export class HttpError extends Error {
    status: number
    constructor(status: number, message: string) {
        super(message)
        this.status = status
        this.name = 'HttpError'
    }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`)

export const badRequest = (message: string) => new HttpError(400, message)

export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message)

export const agentDisabled = () => new HttpError(403, 'This coworker is switched off and cannot run.')

export const setupPending = () => new HttpError(409, 'This coworker is still being set up. Its tasks can run once the setup is finished.')

export const budgetExhausted = () => new HttpError(402, 'Rerun credits used up; automated runs on Rerun models are paused until they reset or you add credits.')
