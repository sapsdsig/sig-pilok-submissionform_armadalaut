import { z } from "zod";
import {
  MAX_DOCUMENTS,
  MAX_FILE_SIZE,
  isAllowedFile,
  type ArmadaKapalFormValues,
} from "./armadaKapal";

const emptyDocumentSchema = z
  .object({
    id: z.string().min(1),
    source: z.literal("empty"),
  });

const existingDocumentSchema = z.object({
  id: z.string().min(1),
  source: z.literal("existing"),
  fileId: z.string().optional(),
  fileName: z.string().min(1, "Dokumen tersimpan tidak valid."),
  fileUrl: z.string().url().optional(),
});

const newDocumentSchema = z
  .object({
    id: z.string().min(1),
    source: z.literal("new"),
    file: z.instanceof(File),
  })
  .superRefine((document, context) => {
    if (!isAllowedFile(document.file)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Format file harus PDF, JPG, JPEG, atau PNG.",
        path: ["file"],
      });
    }
    if (document.file.size > MAX_FILE_SIZE) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ukuran file maksimal 5 MB.",
        path: ["file"],
      });
    }
  });

const documentSchema = z.union([
  emptyDocumentSchema,
  existingDocumentSchema,
  newDocumentSchema,
]);

export const armadaKapalFormSchema: z.ZodType<ArmadaKapalFormValues> = z
  .object({
    namaDistributor: z.string().min(1, "Nama Distributor wajib dipilih."),
    memilikiArmadaKapal: z.boolean().nullable(),
    dokumenKapal: z
      .array(documentSchema)
      .max(MAX_DOCUMENTS, `Maksimal ${MAX_DOCUMENTS} dokumen kapal.`),
  })
  .superRefine((values, context) => {
    if (values.memilikiArmadaKapal === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Konfirmasi kepemilikan armada kapal wajib dipilih.",
        path: ["memilikiArmadaKapal"],
      });
      return;
    }

    if (!values.memilikiArmadaKapal) return;

    const completedDocuments = values.dokumenKapal.filter(
      (document) => document.source !== "empty",
    );
    if (completedDocuments.length === 0 && values.dokumenKapal.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dokumen bukti kepemilikan kapal wajib dilampirkan.",
        path: ["dokumenKapal"],
      });
    }
    values.dokumenKapal.forEach((document, index) => {
      if (document.source === "empty") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dokumen bukti kepemilikan kapal wajib dilampirkan.",
          path: ["dokumenKapal", index, "file"],
        });
      }
    });
  });
