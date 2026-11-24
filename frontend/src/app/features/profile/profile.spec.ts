import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AuthService } from "../../core/auth.service";
import { FAKE_LATENCY_MS } from "../../core/profile.service";
import { Profile } from "./profile";
import { routes } from '../../app.routes';

const ME = {
  id: "00000000-0000-4000-8000-000000000000",
  displayName: "StubUser",
  email: "stub@example.com",
};
const OTHER_NAME = "DemoPlayer";
const UNKNOWN_NAME = "Nobody";

describe("Profile", () => {
  let fixture: ComponentFixture<Profile>;
  let auth: AuthService;

  // Opens /profile/<name>: sets the route input, then lets the fake loads finish.
  async function open(name: string) {
    fixture.componentRef.setInput("name", name);
    fixture.detectChanges();
    // Let the resources start their loads (and their fake timers) first.
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(FAKE_LATENCY_MS);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? "";

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideRouter(routes)],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(Profile);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("shows the private section on your own profile", async () => {
    auth.currentUser.set(ME);
    await open(ME.displayName);
    expect(text()).toContain(ME.displayName);
    expect(text()).toContain("Only you can see this");
    expect(text()).toContain(ME.email);
  });

  it("does not show the private section on someone else's profile", async () => {
    auth.currentUser.set(ME);
    await open(OTHER_NAME);
    expect(text()).toContain(OTHER_NAME);
    expect(text()).not.toContain("Only you can see this");
    expect(text()).not.toContain(ME.email);
  });

  it("does not show the private section when logged out", async () => {
    await open(ME.displayName);
    expect(text()).toContain(ME.displayName);
    expect(text()).not.toContain("Only you can see this");
  });

  it("shows \"Profile not found\" for an unknown name", async () => {
    await open(UNKNOWN_NAME);
    expect(text()).toContain("Profile not found");
  });
});
