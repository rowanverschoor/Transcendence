import { describe, expect, it } from "vitest";
import { ZodValidationPipe } from "./zod-validation.pipe.js";
import { makeClientMessage } from "@transcendence/shared";
import { WsException } from "@nestjs/websockets";

const arena = { width: 800, height: 800 };
const pipe = new ZodValidationPipe(makeClientMessage(arena));

const wireMessage = JSON.stringify({
  type: "input",
  seq: 1,
  mousepos: { x: 10, y: 20 },
});

/** Asserts the callable throws a WsException whose message contains a fragment. */
const expectWsError = (fn: () => unknown, fragment: string): void => {
  try {
    fn();
    expect.fail(`expected WsException containing: ${fragment}`);
  } catch (err) {
    expect(err).toBeInstanceOf(WsException);
    expect(String((err as Error).message)).toContain(fragment);
  }
};

describe("ZodValidationPipe", () => {
  it("parses a JSON string payload and returns the parsed ClientMessage", () => {
    expect(pipe.transform(wireMessage, {} as never)).toEqual({
      type: "input",
      seq: 1,
      mousepos: { x: 10, y: 20 },
    });
  });

  it("validates an already-parsed (non-string) payload", () => {
    expect(pipe.transform({ type: "join" }, {} as never)).toEqual({
      type: "join",
    });
  });

  it("rejects a payload that is not valid JSON", () => {
    expectWsError(
      () => pipe.transform("not json", {} as never),
      "Payload is not valid JSON",
    );
  });

  it("rejects an unknown message type", () => {
    expectWsError(
      () =>
        pipe.transform(
          JSON.stringify({ type: "nope", seq: 2 }),
          {} as never,
        ),
      "type: Invalid discriminator value. Expected 'input' | 'join'",
    );
  });

  it("rejects a missing seq with a per-field issue", () => {
    expectWsError(
      () =>
        pipe.transform(
          JSON.stringify({ type: "input", mousepos: { x: 0, y: 0 } }),
          {} as never,
        ),
      "seq: ",
    );
  });

  it("rejects coordinates outside the arena boundary", () => {
    expectWsError(
      () =>
        pipe.transform(
          JSON.stringify({
            type: "input",
            seq: 0,
            mousepos: { x: 801, y: 20 },
          }),
          {} as never,
        ),
      "mousepos.x: Too big: expected number to be <=800",
    );
  });

  it("rejects a payload whose type field is missing", () => {
    expectWsError(
      () =>
        pipe.transform(
          JSON.stringify({ seq: 1, mousepos: { x: 1, y: 1 } }),
          {} as never,
        ),
      "type: Invalid discriminator value. Expected 'input' | 'join'",
    );
  });
});
