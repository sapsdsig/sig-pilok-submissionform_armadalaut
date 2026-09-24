import { google } from "googleapis";
import type { GoogleConfig } from "../config.js";
import { uniqueDriveFilename } from "../files.js";
import type {
  DriveFileRecord,
  SpreadsheetTables,
  UploadSessionInput,
  UploadSessionResult,
} from "../models.js";
import { WORKFLOW_PROPERTY } from "../constants.js";
import type { GoogleGateway } from "./gateway.js";
import { createGoogleAuth, obtainAccessToken } from "./auth.js";
import { randomUUID } from "node:crypto";

function quoteSheet(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

export class RealGoogleGateway implements GoogleGateway {
  private readonly auth;
  private readonly sheets;
  private readonly drive;

  constructor(private readonly config: GoogleConfig) {
    this.auth = createGoogleAuth(config);
    this.sheets = google.sheets({ version: "v4", auth: this.auth });
    this.drive = google.drive({ version: "v3", auth: this.auth });
  }

  getAccessToken(): Promise<string> {
    return obtainAccessToken(this.config);
  }

  async readMasterRows(): Promise<string[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.config.masterSpreadsheetId,
      range: `${quoteSheet(this.config.masterDistributorSheet)}!A:A`,
    });
    return (response.data.values ?? []).map((row) => row.map(String));
  }

  async readSubmissionTables(): Promise<SpreadsheetTables> {
    const response = await this.sheets.spreadsheets.values.batchGet({
      spreadsheetId: this.config.submissionSpreadsheetId,
      ranges: [
        `${quoteSheet(this.config.submissionSheet)}!A:D`,
        `${quoteSheet(this.config.submissionKapalSheet)}!A:G`,
      ],
    });
    return {
      submissions: (response.data.valueRanges?.[0]?.values ?? []).map((row) => row.map(String)),
      kapal: (response.data.valueRanges?.[1]?.values ?? []).map((row) => row.map(String)),
    };
  }

  async writeSubmissionTables(tables: SpreadsheetTables): Promise<void> {
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.config.submissionSpreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          {
            range: `${quoteSheet(this.config.submissionSheet)}!A1:D${Math.max(1, tables.submissions.length)}`,
            values: tables.submissions,
          },
          {
            range: `${quoteSheet(this.config.submissionKapalSheet)}!A1:G${Math.max(1, tables.kapal.length)}`,
            values: tables.kapal,
          },
        ],
      },
    });
  }

  async createUploadSession(input: UploadSessionInput): Promise<UploadSessionResult> {
    const accessToken = await this.getAccessToken();
    const uploadToken = randomUUID();
    const generated = await this.drive.files.generateIds({ count: 1, space: "drive", type: "files" });
    const fileId = generated.data.ids?.[0];
    if (!fileId) throw new Error("Google Drive did not generate a file ID");
    const metadata = {
      id: fileId,
      name: uniqueDriveFilename(input.namaDistributor, input.fileName),
      mimeType: input.mimeType,
      parents: [this.config.kapalFolderId],
      appProperties: {
        pilokWorkflow: WORKFLOW_PROPERTY,
        staged: "true",
        uploadToken,
        displayName: input.fileName,
        expectedMimeType: input.mimeType,
        expectedSize: String(input.size),
        distributor: input.namaDistributor,
      },
    };
    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size,parents,webViewLink,trashed,appProperties",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": input.mimeType,
          "X-Upload-Content-Length": String(input.size),
          ...(input.origin ? { Origin: input.origin } : {}),
        },
        body: JSON.stringify(metadata),
      },
    );
    const uploadUrl = response.headers.get("location");
    if (!response.ok || !uploadUrl) {
      throw new Error("Google resumable session initiation failed");
    }
    return { uploadUrl, uploadToken, fileId };
  }

  async getDriveFile(fileId: string): Promise<DriveFileRecord> {
    const response = await this.drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: "id,name,mimeType,size,parents,webViewLink,trashed,appProperties",
    });
    const file = response.data;
    return {
      id: file.id ?? "",
      name: file.name ?? "",
      mimeType: file.mimeType ?? "",
      size: Number(file.size ?? 0),
      parents: file.parents ?? [],
      webViewLink: file.webViewLink ?? "",
      trashed: file.trashed ?? false,
      appProperties: file.appProperties ?? {},
    };
  }

  async markFilesCommitted(fileIds: string[]): Promise<void> {
    await Promise.all(
      fileIds.map((fileId) =>
        this.drive.files.update({
          fileId,
          supportsAllDrives: true,
          requestBody: { appProperties: { staged: "false" } },
        }),
      ),
    );
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.drive.files.delete({ fileId, supportsAllDrives: true });
  }

  async getFolder(): Promise<{ id: string; mimeType: string; trashed: boolean }> {
    const response = await this.drive.files.get({
      fileId: this.config.kapalFolderId,
      supportsAllDrives: true,
      fields: "id,mimeType,trashed",
    });
    return {
      id: response.data.id ?? "",
      mimeType: response.data.mimeType ?? "",
      trashed: response.data.trashed ?? false,
    };
  }

  async getSpreadsheetSheetNames(spreadsheetId: string): Promise<string[]> {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });
    return response.data.sheets?.flatMap((sheet) => sheet.properties?.title ?? []) ?? [];
  }
}
