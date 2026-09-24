export const MASTER_HEADERS = ["Nama Distributor"] as const;
export const SUBMISSION_HEADERS = [
  "nama_distributor",
  "memiliki_armada_kapal",
  "created_at",
  "updated_at",
] as const;
export const SUBMISSION_KAPAL_HEADERS = [
  "nama_distributor",
  "nomor_kapal",
  "file_id",
  "file_name",
  "file_url",
  "created_at",
  "updated_at",
] as const;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_DOCUMENTS = 10;
export const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const WORKFLOW_PROPERTY = "armada-kapal";
