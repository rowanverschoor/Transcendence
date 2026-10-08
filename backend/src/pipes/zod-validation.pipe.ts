import { Injectable, type ArgumentMetadata, type PipeTransform } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import type { z } from "zod";

/**
 * Validates a message payload against a zod schema.
 *
 * The wire format is a JSON string (ADR 0005), so a string payload is
 * JSON-parsed before schema parsing. A payload that is not valid JSON or does
 * not conform to the schema raises a WsException; socket.io delivers that to
 * the sender as an "exception" event instead of running the handler.
 */
@Injectable()
export class ZodValidationPipe<T extends z.ZodType>
  implements PipeTransform<unknown, z.output<T>>
{
  constructor(private readonly schema: T) {}

  transform(value: unknown, _metadata: ArgumentMetadata): z.output<T> {
    let data = value;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        throw new WsException("Payload is not valid JSON");
      }
    }
    const result = this.schema.safeParse(data);
    if (!result.success) {
      throw new WsException(formatIssues(result.error));
    }
    return result.data;
  }
}

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
