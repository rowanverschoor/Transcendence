import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Home } from "./home";

describe("Home", () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeAll(() => {
    // jsdom does not implement matchMedia; Home polls it for animations.
    window.matchMedia ??= (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
