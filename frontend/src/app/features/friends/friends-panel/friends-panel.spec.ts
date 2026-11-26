import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FriendsPanel } from "./friends-panel";

describe("FriendsPanel", () => {
  let component: FriendsPanel;
  let fixture: ComponentFixture<FriendsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FriendsPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(FriendsPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
