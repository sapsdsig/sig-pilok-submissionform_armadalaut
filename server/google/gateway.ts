import type {
  DriveFileRecord,
  SpreadsheetTables,
  UploadSessionInput,
  UploadSessionResult,
} from "../models.js";

export interface GoogleGateway {
  getAccessToken(): Promise<string>;
  readMasterRows(): Promise<string[][]>;
  readSubmissionTables(): Promise<SpreadsheetTables>;
  writeSubmissionTables(tables: SpreadsheetTables): Promise<void>;
  createUploadSession(input: UploadSessionInput): Promise<UploadSessionResult>;
  getDriveFile(fileId: string): Promise<DriveFileRecord>;
  markFilesCommitted(fileIds: string[]): Promise<void>;
  deleteFile(fileId: string): Promise<void>;
  getFolder(): Promise<{ id: string; mimeType: string; trashed: boolean }>;
  getSpreadsheetSheetNames(spreadsheetId: string): Promise<string[]>;
}
