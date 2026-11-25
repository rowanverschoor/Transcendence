import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DrizzleCredentialsRepository } from "../auth/drizzle-credentials.repository.js";
import { DuplicateDisplayNameError, DuplicateEmailError } from "../users/users.repository.js";
import { DrizzleUsersRepository } from "../users/drizzle-users.repository.js";
import type { User } from "@transcendence/shared/auth";
import type { DatabaseService } from "./database.service.js";
import { makeTestDatabase, migrateTestDatabase, resetTestDatabase } from "./test-database.js";

const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeDb("Drizzle repositories", () => {
	let database: DatabaseService;
	let users: DrizzleUsersRepository;
	let credentials: DrizzleCredentialsRepository;

	beforeAll(async () => {
		database = makeTestDatabase();
		await migrateTestDatabase(database);
		users = new DrizzleUsersRepository(database);
		credentials = new DrizzleCredentialsRepository(database);
	});
	beforeEach(async () => {
		await resetTestDatabase(database);
	});
	const makeUser = (overrides: Partial<User> = {}): User => ({
		id: crypto.randomUUID(),
		email: "jeff@example.com",
		displayName: "JeffKaplan",
		...overrides,
	});
	describe("users", () => {
		it("creates a user and finds it by id", async () => {
			const user = makeUser();
			await users.create(user);

			expect(await users.findById(user.id)).toEqual(user);
		});
		it("finds a user by email", async () => {
			const user = makeUser({ email: "marc@example.com" });
			await users.create(user);

			expect(await users.findByEmail("marc@example.com")).toEqual(user);
		});
		it("returns null for searching unknown email", async () => {
			expect(await users.findByEmail("aaron@exmaple.com")).toBeNull();
		});
		it("finds by displayname, ignoring case sensitivity, but keeps casing.", async () => {
			const user = makeUser({ displayName: "Aaron"});
			await users.create(user);

			const found = await users.findByDisplayName("aaron");
			expect(found).toEqual(user);
			expect(found?.displayName).toBe("Aaron");
		});
		it("returns null for unknown display name",  async () => {
			expect(await users.findByDisplayName("BobbyKotick")).toBeNull();
		});
		it("rejects duplicate email attempts", async() => {
			await users.create(
				makeUser({ email: "same@example.com", displayName: "First" })
			);
			await expect(
				users.create(
					makeUser({ email: "same@example.com", displayName: "Second" })
				)
			).rejects.toBeInstanceOf(DuplicateEmailError);
		});
		it("rejects duplicate displayname, ignoring case", async () => {
			await users.create(
				makeUser({ email: "LOUD@example.com", displayName: "LOUD"})
			);
			await expect(
				users.create(
					makeUser({ email: "quiet@example.com", displayName: "loud"})
				)
			).rejects.toBeInstanceOf(DuplicateDisplayNameError);
		});
	});
	describe("credentials", () => {
		it("creates user and pass hash in one call", async() => {
			const user = makeUser();
			const passwordHash = "salt+hash-in-one-string"

			await credentials.createUserWithCredentials(user, passwordHash);
			
			expect(await users.findById(user.id)).toEqual(user);
			expect(await credentials.findPasswordHash(user.id)).toBe(passwordHash);
		});
		it("returns null on no credentials", async () => {
			const user = makeUser();
			await users.create(user);
			
			expect(await credentials.findPasswordHash(user.id)).toBeNull();
		});
		it("does not leave a user when email is already taken", async() => {
			await users.create(
				makeUser({ email: "dup@example.com", displayName: "First"})
			);

			const user = makeUser({ email: "dup@example.com", displayName: "Second"});
			await expect(
				credentials.createUserWithCredentials(user, "hash")
			).rejects.toBeInstanceOf(DuplicateEmailError);

			expect(await users.findById(user.id)).toBeNull();
		});
		it("rolls back user when credential insert fails", async () => {
			const user = makeUser();
			
			await expect(
				credentials.createUserWithCredentials(user, null as unknown as string)
			).rejects.toThrow();
			
			expect(await users.findById(user.id)).toBeNull();
			expect(await credentials.findPasswordHash(user.id)).toBeNull();
		});
		it("does not leave a user when displayname is already taken", async() => {
			await users.create(
				makeUser({ email: "two@example.com", displayName: "same"})
			);

			const user = makeUser({ email: "one@example.com", displayName: "same"});
			await expect(
				credentials.createUserWithCredentials(user, "hash")
			).rejects.toBeInstanceOf(DuplicateDisplayNameError);

			expect(await users.findById(user.id)).toBeNull();
			expect(await credentials.findPasswordHash(user.id)).toBeNull();
		});
	})
	afterAll(async () => { await database.onModuleDestroy(); });
})