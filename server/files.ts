import { randomUUID } from "node:crypto";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "./constants.js";
import { ApiError } from "./errors.js";

export function assertUploadMetadata(mimeType: string, size: number): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new ApiError(400, "VALIDATION_ERROR", "Format file harus PDF, JPG, JPEG, atau PNG.");
  }
  if (!Number.isInteger(size) || size <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Ukuran file tidak valid.");
  }
  if (size > MAX_FILE_SIZE) {
    throw new ApiError(400, "VALIDATION_ERROR", "Ukuran file maksimal 5 MB.");
  }
}

export function sanitizeFilename(value: string, fallback = "dokumen-kapal"): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  return normalized || fallback;
}

export function uniqueDriveFilename(distributor: string, originalFilename: string): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${sanitizeFilename(distributor, "distributor")}-${timestamp}-${randomUUID()}-${sanitizeFilename(originalFilename)}`;
}
