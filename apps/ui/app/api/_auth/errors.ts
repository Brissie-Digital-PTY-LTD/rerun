// Thrown when the caller is unauthenticated or targets a resource outside their
// workspace. Most callers swallow it to fail closed (empty/null result); the
// ones that throw surface a generic "not found" so we don't leak existence.
export class AuthorizationError extends Error {
    constructor(message = 'Not authorized') {
        super(message)
        this.name = 'AuthorizationError'
    }
}

// No caller identity at all, as opposed to an identity that may not touch the resource. The API
// answers the first with a 401 so the app refreshes its token, the second with a 404.
export class UnauthenticatedError extends AuthorizationError {
    constructor() {
        super('Not authenticated')
        this.name = 'UnauthenticatedError'
    }
}
