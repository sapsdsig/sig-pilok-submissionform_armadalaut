export const MAX_DOCUMENTS = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type ExistingKapalDocument = {
  id: string;
  source: "existing";
  fileId?: string;
  fileName: string;
  fileUrl?: string;
};

export type NewKapalDocument = {
  id: string;
  source: "new";
  file: File;
};

export type KapalDocument = ExistingKapalDocument | NewKapalDocument;

export type ArmadaKapalSubmission = {
  namaDistributor: string;
  memilikiArmadaKapal: boolean;
  dokumenKapal: KapalDocument[];
  createdAt?: string;
  updatedAt?: string;
};

export type EmptyKapalDocument = {
  id: string;
  source: "empty";
};

export type KapalDocumentField = KapalDocument | EmptyKapalDocument;

export type ArmadaKapalFormValues = {
  namaDistributor: string;
  memilikiArmadaKapal: boolean | null;
  dokumenKapal: KapalDocumentField[];
};

let sequence = 0;

export function createDocumentId(): string {
  sequence += 1;
  return `kapal-${Date.now()}-${sequence}`;
}

export function createEmptyDocument(): EmptyKapalDocument {
  return { id: createDocumentId(), source: "empty" };
}

export function isAllowedFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const extensionAllowed = ["pdf", "jpg", "jpeg", "png"].includes(extension ?? "");
  return ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number]) && extensionAllowed;
}
