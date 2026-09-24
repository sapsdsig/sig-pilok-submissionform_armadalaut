import {
  MASTER_HEADERS,
  SUBMISSION_HEADERS,
  SUBMISSION_KAPAL_HEADERS,
  WORKFLOW_PROPERTY,
} from "../constants.js";
import type { GoogleGateway } from "../google/gateway.js";
import type {
  DriveFileRecord,
  SpreadsheetTables,
  UploadSessionInput,
  UploadSessionResult,
} from "../models.js";

export const TEST_CONFIG = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  masterSpreadsheetId: "master-sheet",
  submissionSpreadsheetId: "submission-sheet",
  kapalFolderId: "kapal-folder",
  masterDistributorSheet: "master_distributor",
  submissionSheet: "submission",
  submissionKapalSheet: "submission_kapal",
};

export function driveFile(
  id: string,
  overrides: Partial<DriveFileRecord> = {},
): DriveFileRecord {
  const base: DriveFileRecord = {
    id,
    name: `stored-${id}.pdf`,
    mimeType: "application/pdf",
    size: 1024,
    parents: [TEST_CONFIG.kapalFolderId],
    webViewLink: `https://drive.google.com/file/d/${id}/view`,
    trashed: false,
    appProperties: {
      pilokWorkflow: WORKFLOW_PROPERTY,
      staged: "true",
      uploadToken: `00000000-0000-4000-8000-${id.padStart(12, "0").slice(-12)}`,
      displayName: `${id}.pdf`,
      distributor: "ABADI PUTERA WIRAJAYA, PT",
    },
  };
  return {
    ...base,
    ...overrides,
    appProperties: { ...base.appProperties, ...overrides.appProperties },
  };
}

export class MockGoogleGateway implements GoogleGateway {
  masterRows: string[][] = [[...MASTER_HEADERS], ["ABADI PUTERA WIRAJAYA, PT"], ["ADE LESTARI SEJATI, PT"]];
  tables: SpreadsheetTables = {
    submissions: [[...SUBMISSION_HEADERS]],
    kapal: [[...SUBMISSION_KAPAL_HEADERS]],
  };
  files = new Map<string, DriveFileRecord>();
  events: string[] = [];
  writeError: Error | null = null;

  async getAccessToken(): Promise<string> {
    return "access-token";
  }

  async readMasterRows(): Promise<string[][]> {
    return this.masterRows.map((row) => [...row]);
  }

  async readSubmissionTables(): Promise<SpreadsheetTables> {
    return {
      submissions: this.tables.submissions.map((row) => [...row]),
      kapal: this.tables.kapal.map((row) => [...row]),
    };
  }

  async writeSubmissionTables(tables: SpreadsheetTables): Promise<void> {
    this.events.push("write");
    if (this.writeError) throw this.writeError;
    this.tables = {
      submissions: tables.submissions.map((row) => [...row]),
      kapal: tables.kapal.map((row) => [...row]),
    };
  }

  async createUploadSession(input: UploadSessionInput): Promise<UploadSessionResult> {
    void input;
    return {
      uploadUrl: "https://upload.example/session",
      uploadToken: "00000000-0000-4000-8000-000000000001",
      fileId: "generated-file-id",
    };
  }

  async getDriveFile(fileId: string): Promise<DriveFileRecord> {
    this.events.push(`get:${fileId}`);
    const file = this.files.get(fileId);
    if (!file) throw new Error("not found");
    return { ...file, parents: [...file.parents], appProperties: { ...file.appProperties } };
  }

  async markFilesCommitted(fileIds: string[]): Promise<void> {
    this.events.push(`commit:${fileIds.join(",")}`);
    fileIds.forEach((fileId) => {
      const file = this.files.get(fileId);
      if (file) file.appProperties.staged = "false";
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    this.events.push(`delete:${fileId}`);
    this.files.delete(fileId);
  }

  async getFolder() {
    return { id: TEST_CONFIG.kapalFolderId, mimeType: "application/vnd.google-apps.folder", trashed: false };
  }

  async getSpreadsheetSheetNames(): Promise<string[]> {
    return [TEST_CONFIG.masterDistributorSheet, TEST_CONFIG.submissionSheet, TEST_CONFIG.submissionKapalSheet];
  }
}
