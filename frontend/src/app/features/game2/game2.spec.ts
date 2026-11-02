import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Game2 } from "./game2";

describe("Game2", () => {
  let component: Game2;
  let fixture: ComponentFixture<Game2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Game2],
    }).compileComponents();

    fixture = TestBed.createComponent(Game2);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
