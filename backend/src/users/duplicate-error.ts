import { DuplicateEmailError } from "./users.repository.js";
import { DuplicateDisplayNameError } from "./users.repository.js";

type PostgresError = {
	code?: string;
	constraint?: string;
	cause?: unknown;	
};

function findPostgresError(error: unknown): PostgresError | undefined {
	let current: unknown = error;

	while (typeof current === "object" && current !== null) {
		const candidate = current as PostgresError;

		if (candidate.code === "23505")
			return candidate;
		current = candidate.cause;
	}
	return undefined;
}

export function translateDuplicateUserError(error: unknown): never {
	const postgresError = findPostgresError(error);

	if (postgresError?.constraint === "users_email_unique")
		throw new DuplicateEmailError();

	if (postgresError?.constraint === "users_display_name_lower_idx")
		throw new DuplicateDisplayNameError();

	throw error;
}