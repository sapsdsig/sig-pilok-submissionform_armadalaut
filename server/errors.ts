export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "MASTER_NOT_FOUND"
  | "SUBMISSION_ALREADY_EXISTS"
  | "SUBMISSION_NOT_FOUND"
  | "UPLOAD_SESSION_FAILED"
  | "UPLOAD_VERIFY_FAILED"
  | "GOOGLE_API_ERROR"
  | "CONFIGURATION_ERROR"
  | "METHOD_NOT_ALLOWED";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function sanitizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(500, "GOOGLE_API_ERROR", "Layanan Google sedang mengalami kendala.");
}
