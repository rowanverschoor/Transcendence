import { TestBed } from "@angular/core/testing";
import { AuthService } from "./auth.service";
import { FRIENDS_LATENCY_MS, FriendsService } from "./friends.service";

const ME = { id: "00000000-0000-4000-8000-000000000000", displayName: "StubUser", email: "t@example.com" } as const;

describe("FriendsService", () => {
  let service: FriendsService;
  let auth: AuthService;
  const signal = () => new AbortController().signal;
  const settle = () => vi.advanceTimersByTimeAsync(FRIENDS_LATENCY_MS);
  // Start the call, let the fake latency pass, return its result.
  async function done<T>(p: Promise<T>): Promise<T> {
    const r = p.then(v => ({ v }), e => ({ e }));
    await settle();
    const out = await r;
    if ("e" in out) throw out.e;
    return out.v;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    auth = TestBed.inject(AuthService);
    auth.currentUser.set({ ...ME });
    service = TestBed.inject(FriendsService);
  });

  afterEach(() => vi.useRealTimers());

  it("lists the seeded friend and request", async () => {
    const lists = await done(service.list(signal()));
    expect(lists.friends.map(p => p.displayName)).toEqual(["DemoPlayer"]);
    expect(lists.received.map(p => p.displayName)).toEqual(["Alice"]);
    expect(lists.send).toEqual([]);
  });

  it("accepts a received request", async () => {
    await done(service.accept("Alice", signal()));
    expect(await done(service.statusWith("Alice", signal()))).toBe("friends");
  });

  it("declines a received request and deletes it", async () => {
    await done(service.decline("Alice", signal()));
    expect(await done(service.statusWith("Alice", signal()))).toBe("none");
  });

  it("sends, cancels and unfriends", async () => {
    await done(service.unfriend("DemoPlayer", signal()));
    await done(service.sendRequest("DemoPlayer", signal()));
    expect(await done(service.statusWith("DemoPlayer", signal()))).toBe("send");
    await done(service.cancel("DemoPlayer", signal()));
    expect(await done(service.statusWith("DemoPlayer", signal()))).toBe("none");
  });

  it("sending to someone who asked me accepts", async () => {
    await done(service.sendRequest("Alice", signal()));
    expect(await done(service.statusWith("Alice", signal()))).toBe("friends");
  });

  it("409 when the state does not match", async () => {
    await expect(done(service.accept("DemoPlayer", signal()))).rejects.toMatchObject({ status: 409 });
    await done(service.sendRequest("DemoPlayer", signal()).catch(() => undefined));
    await done(service.unfriend("DemoPlayer", signal()));
    await done(service.sendRequest("DemoPlayer", signal()));
    // a request I sent myself can't be accepted by me
    await expect(done(service.accept("DemoPlayer", signal()))).rejects.toMatchObject({ status: 409 });
    await expect(done(service.sendRequest("DemoPlayer", signal()))).rejects.toMatchObject({ status: 409 });
  });

  it("401 when logged out", async () => {
    auth.logout();
    await expect(done(service.list(signal()))).rejects.toMatchObject({ status: 401 });
  });

  it("404 unknown, 400 own name, case-insensitive", async () => {
    await expect(done(service.statusWith("Nobody", signal()))).rejects.toMatchObject({ status: 404 });
    await expect(done(service.statusWith("stubuser", signal()))).rejects.toMatchObject({ status: 400 });
    expect(await done(service.statusWith("aLiCe", signal()))).toBe("received");
  });

  it("an aborted request changes nothing", async () => {
    const c = new AbortController();
    const r = expect(service.accept("Alice", c.signal)).rejects.toBeDefined();
    c.abort();
    await settle();
    await r;
    expect(await done(service.statusWith("Alice", signal()))).toBe("received");
  });
});
