import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Profile } from "./profile";
import { routes } from '../../app.routes';

describe("Profile", () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
