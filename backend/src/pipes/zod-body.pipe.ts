import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import { z } from "zod";

/**
 * Validates an HTTP request body against a zod schema.
 *
 * Invalid input becomes a 400 with the problems per field in `errors`, so a
 * form can show each message next to the right input (docs/auth.md).
 * WebSocket messages use ZodValidationPipe instead.
 */

@Injectable()
export class ZodBodyPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Invalid input",
        error: "Bad Request",
        errors: z.flattenError(result.error).fieldErrors,
      });
    }
    return result.data;
  }
}