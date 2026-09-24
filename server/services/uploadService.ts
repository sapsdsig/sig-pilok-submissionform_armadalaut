import type { GoogleConfig } from "../config.js";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  WORKFLOW_PROPERTY,
} from "../constants.js";
import { ApiError } from "../errors.js";
import { assertUploadMetadata } from "../files.js";
import type { GoogleGateway } from "../google/gateway.js";
import type { DriveFileRecord, UploadSessionInput } from "../models.js";

export class UploadService {
  constructor(
    private readonly gateway: GoogleGateway,
    private readonly config: GoogleConfig,
  ) {}

  async createSession(input: UploadSessionInput) {
    assertUploadMetadata(input.mimeType, input.size);
    try {
      return await this.gateway.createUploadSession(input);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, "UPLOAD_SESSION_FAILED", "Sesi upload gagal dibuat.");
    }
  }

  async verify(fileId: string, uploadToken?: string): Promise<DriveFileRecord> {
    let file: DriveFileRecord;
    try {
      file = await this.gateway.getDriveFile(fileId);
    } catch {
      throw new ApiError(400, "UPLOAD_VERIFY_FAILED", "File upload tidak dapat diverifikasi.");
    }
    const validMime = ALLOWED_MIME_TYPES.includes(
      file.mimeType as (typeof ALLOWED_MIME_TYPES)[number],
    );
    const validToken = !uploadToken || file.appProperties.uploadToken === uploadToken;
    const expectedMimeMatches = !uploadToken || file.appProperties.expectedMimeType === file.mimeType;
    const expectedSizeMatches = !uploadToken || Number(file.appProperties.expectedSize) === file.size;
    let validViewLink = false;
    try {
      const viewUrl = new URL(file.webViewLink);
      validViewLink = viewUrl.protocol === "https:" &&
        (viewUrl.hostname === "drive.google.com" || viewUrl.hostname === "docs.google.com");
    } catch {
      validViewLink = false;
    }
    if (
      !file.id ||
      file.trashed ||
      !file.parents.includes(this.config.kapalFolderId) ||
      !validMime ||
      file.size <= 0 ||
      file.size > MAX_FILE_SIZE ||
      file.appProperties.pilokWorkflow !== WORKFLOW_PROPERTY ||
      !validToken ||
      !expectedMimeMatches ||
      !expectedSizeMatches ||
      !validViewLink
    ) {
      throw new ApiError(400, "UPLOAD_VERIFY_FAILED", "File upload tidak memenuhi ketentuan.");
    }
    return file;
  }

  async cleanup(files: Array<{ fileId: string; uploadToken: string }>): Promise<void> {
    for (const item of files) {
      const file = await this.verify(item.fileId, item.uploadToken);
      if (file.appProperties.staged !== "true") {
        throw new ApiError(400, "UPLOAD_VERIFY_FAILED", "File bukan staged upload yang dapat dibersihkan.");
      }
      await this.gateway.deleteFile(file.id);
    }
  }
}
