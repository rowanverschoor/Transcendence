/** An HTTP failure with its status, so callers can tell 404 from 500. */
export class ApiError extends Error {
	constructor(readonly status: number, message: string) {
		super(message);
	}
}
