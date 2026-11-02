import { TestBed } from "@angular/core/testing";
import { PlayerStats } from "@transcendence/shared/stats";
import { StatsService } from "./stats.service";

describe("StatsService", () => {
  let service: StatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("load() fills stats", async () => {
    vi.useFakeTimers();
    expect(service.stats()).toBeNull();
    const loading = service.load("00000000-0000-4000-8000-000000000000");
    await vi.advanceTimersByTimeAsync(500);
    await loading;
    // Check the contract, not the stub's numbers: any valid PlayerStats passes.
    expect(PlayerStats.safeParse(service.stats()).success).toBe(true);
  });

  it("clear() resets stats", () => {
    service.stats.set({ ballsConsumed: 1 });
    service.clear();
    expect(service.stats()).toBeNull();
  });
});
