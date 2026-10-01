import { ComponentFixture, TestBed } from "@angular/core/testing";
import { vi } from "vitest";
import { WsDemo } from "./ws-demo";

const { fakeSocket } = vi.hoisted(() => ({
	fakeSocket: { on: vi.fn(), send: vi.fn(), close: vi.fn(), connected: false },
}));

vi.mock("socket.io-client", () => ({ io: vi.fn(() => fakeSocket) }));

describe("WsDemo", () => {
	let component: WsDemo;
	let fixture: ComponentFixture<WsDemo>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [WsDemo],
		}).compileComponents();

		fixture = TestBed.createComponent(WsDemo);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
