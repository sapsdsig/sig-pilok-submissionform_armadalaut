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
  })
  .superRefine((_document, context) => {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Dokumen bukti kepemilikan kapal wajib dilampirkan.",
      path: ["file"],
    });
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

export const armadaKapalFormSchema: z.ZodType<ArmadaKapalFormValues> = z.object({
  namaDistributor: z.string().min(1, "Nama Distributor wajib dipilih."),
  memilikiArmadaKapal: z.boolean().refine((value) => value === true, {
    message: "Konfirmasi kepemilikan armada kapal wajib dipilih.",
  }),
  dokumenKapal: z
    .array(documentSchema)
    .min(1, "Dokumen bukti kepemilikan kapal wajib dilampirkan.")
    .max(MAX_DOCUMENTS, `Maksimal ${MAX_DOCUMENTS} dokumen kapal.`),
});
