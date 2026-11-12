import { TestBed } from "@angular/core/testing";
import { PrivateProfile, PublicProfile } from "@transcendence/shared/profile";
import { ApiError } from "./api-error";
import { AuthService } from "./auth.service";
import { FAKE_LATENCY_MS, ProfileService } from "./profile.service";

const ME = {
  id: "00000000-0000-4000-8000-000000000000",
  displayName: "TestUser",
  email: "test@example.com",
} as const;
const OTHER_NAME = "DemoPlayer";
const UNKNOWN_NAME = "Nobody";

describe("ProfileService", () => {
  let service: ProfileService;
  let auth: AuthService;
  const signal = () => new AbortController().signal;
  const settle = () => vi.advanceTimersByTimeAsync(FAKE_LATENCY_MS);

  beforeEach(() => {
    vi.useFakeTimers();
    auth = TestBed.inject(AuthService);
    service = TestBed.inject(ProfileService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("public profile needs no login and has no private fields", async () => {
    const result = service.getPublic(OTHER_NAME, signal());
    await settle();
    const profile = await result;
    expect(PublicProfile.safeParse(profile).success).toBe(true);
    expect("email" in profile).toBe(false);
  });

  it("looks names up ignoring case", async () => {
    const result = service.getPublic("dEmOpLaYeR", signal());
    await settle();
    expect((await result).displayName).toBe(OTHER_NAME);
  });

  it("unknown user is a 404", async () => {
    const result = expect(service.getPublic(UNKNOWN_NAME, signal())).rejects.toMatchObject({ status: 404 });
    await settle();
    await result;
  });

  it("private profile loads for the logged-in user", async () => {
    auth.currentUser.set({ ...ME });
    const result = service.getMe(signal());
    await settle();
    const profile = await result;
    expect(PrivateProfile.safeParse(profile).success).toBe(true);
    expect(profile.id).toBe(ME.id);
  });

  it("private profile is a 401 when logged out", async () => {
    const result = expect(service.getMe(signal())).rejects.toBeInstanceOf(ApiError);
    await settle();
    await result;
  });

  it("an aborted request is dropped", async () => {
    auth.currentUser.set({ ...ME });
    const controller = new AbortController();
    const result = expect(service.getMe(controller.signal)).rejects.toBeDefined();
    controller.abort();
    await settle();
    await result;
  });
});
