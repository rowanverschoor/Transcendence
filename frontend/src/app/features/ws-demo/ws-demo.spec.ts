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

	it("increments seq only for messages actually sent", () => {
		fixture.detectChanges();

		// While disconnected: mousemove creates nothing, sends nothing.
		fakeSocket.connected = false;
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1, clientY: 2 }));
		expect(fakeSocket.send).not.toHaveBeenCalled();

		// Once connected: the first sent message starts at seq 0.
		fakeSocket.connected = true;
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 3, clientY: 4 }));
		expect(fakeSocket.send).toHaveBeenCalledTimes(1);
		const sent = JSON.parse(fakeSocket.send.mock.calls[0]![0] as string);
		expect(sent.seq).toBe(0);
		expect(sent.x).toBe(3);
		expect(sent.y).toBe(4);
	});

	afterEach(() => {
		// Removes the document-level mousemove listener via ngOnDestroy.
		fixture.destroy();
	});
});
