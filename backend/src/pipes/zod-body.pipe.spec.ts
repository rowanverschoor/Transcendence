import { BadRequestException } from "@nestjs/common";
import { RegisterRequest } from "@transcendence/shared/auth";
import { describe, expect, it } from "vitest";
import { ZodBodyPipe } from "./zod-body.pipe.js";

const pipe = new ZodBodyPipe(RegisterRequest);

/** Runs the pipe and returns the 400 response body it throws. */
const rejection = (body: unknown): unknown => {
  try {
    pipe.transform(body);
  } catch (err) {
    expect(err).toBeInstanceOf(BadRequestException);
    return (err as BadRequestException).getResponse();
  }
  return expect.fail("expected a BadRequestException");
};

describe("ZodBodyPipe", () => {
  it("returns the cleaned body when it is valid", () => {
    const body = { email: " Sam@X.com ", displayName: "Sam", password: "correct-horse" };
    expect(pipe.transform(body)).toEqual({
      email: "sam@x.com",
      displayName: "Sam",
      password: "correct-horse",
    });
  });

  it("drops fields the schema does not know", () => {
    const body = { email: "sam@x.com", displayName: "Sam", password: "correct-horse", isAdmin: true };
    expect(pipe.transform(body)).not.toHaveProperty("isAdmin");
  });

  it("rejects invalid input with a 400 and the problems per field", () => {
    expect(rejection({ email: "nope", displayName: "Sam", password: "password1" })).toEqual({
      statusCode: 400,
      message: "Invalid input",
      error: "Bad Request",
      errors: {
        email: ["Enter a valid email address"],
        password: ["This password is too common"],
      },
    });
  });

  it("rejects a body that is not an object", () => {
    expect(rejection("hello")).toMatchObject({ statusCode: 400, errors: {} });
  });
});
