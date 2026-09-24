import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ApiError, sanitizeError } from "./errors.js";

export type ApiHandler = (request: VercelRequest, response: VercelResponse) => Promise<void> | void;

export function withJsonErrors(handler: ApiHandler): ApiHandler {
  return async (request, response) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    try {
      await handler(request, response);
    } catch (error) {
      if (!(error instanceof ApiError) && process.env.NODE_ENV === "development") {
        const details = error && typeof error === "object"
          ? error as { name?: unknown; code?: unknown; response?: { status?: unknown } }
          : {};
        process.stderr.write(
          `[API] Unhandled upstream error name=${String(details.name ?? "UnknownError")} code=${String(details.code ?? "unknown")} status=${String(details.response?.status ?? "unknown")}\n`,
        );
      }
      const safe = sanitizeError(error);
      response.status(safe.status).json({
        error: { code: safe.code, message: safe.message },
      });
    }
  };
}

export function requireMethod(
  request: VercelRequest,
  response: VercelResponse,
  methods: string[],
): void {
  if (!methods.includes(request.method ?? "")) {
    response.setHeader("Allow", methods.join(", "));
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "Metode HTTP tidak didukung.");
  }
}

export function parseBody(request: VercelRequest): unknown {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body) as unknown;
    } catch {
      throw new ApiError(400, "VALIDATION_ERROR", "JSON request tidak valid.");
    }
  }
  return request.body;
}

export function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
