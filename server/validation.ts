import { z } from "zod";
import { MAX_DOCUMENTS } from "./constants.js";
import { ApiError } from "./errors.js";
import type { SubmissionInput } from "./models.js";

const documentSchema = z.object({
  fileId: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(255),
  fileUrl: z.string().url().optional(),
});

const submissionSchema = z
  .object({
    namaDistributor: z.string().trim().min(1),
    memilikiArmadaKapal: z.boolean(),
    dokumenKapal: z.array(documentSchema).max(MAX_DOCUMENTS),
  })
  .superRefine((input, context) => {
    if (input.memilikiArmadaKapal && input.dokumenKapal.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dokumenKapal"],
        message: "Minimal satu dokumen kapal wajib disertakan.",
      });
    }
    if (!input.memilikiArmadaKapal && input.dokumenKapal.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dokumenKapal"],
        message: "Dokumen kapal harus kosong jika tidak memiliki armada kapal.",
      });
    }
  });

export function parseSubmissionInput(value: unknown): SubmissionInput {
  const result = submissionSchema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Payload submission tidak valid.");
  }
  return result.data;
}

const uploadSessionSchema = z.object({
  namaDistributor: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1),
  size: z.number(),
});

export function parseUploadSessionInput(value: unknown) {
  const result = uploadSessionSchema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Metadata upload tidak valid.");
  }
  return result.data;
}

const verifySchema = z.object({
  fileId: z.string().trim().min(1),
  uploadToken: z.string().uuid(),
});

export function parseVerifyInput(value: unknown) {
  const result = verifySchema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Data verifikasi upload tidak valid.");
  }
  return result.data;
}

const cleanupSchema = z.object({
  files: z.array(verifySchema).min(1).max(MAX_DOCUMENTS),
});

export function parseCleanupInput(value: unknown) {
  const result = cleanupSchema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Data cleanup upload tidak valid.");
  }
  return result.data;
}
