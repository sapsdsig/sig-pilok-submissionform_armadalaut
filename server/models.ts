export type SpreadsheetTables = {
  submissions: string[][];
  kapal: string[][];
};

export type DriveFileRecord = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  parents: string[];
  webViewLink: string;
  trashed: boolean;
  appProperties: Record<string, string>;
};

export type SubmissionDocumentInput = {
  fileId: string;
  fileName: string;
  fileUrl?: string;
};

export type SubmissionInput = {
  namaDistributor: string;
  memilikiArmadaKapal: boolean;
  dokumenKapal: SubmissionDocumentInput[];
};

export type SubmissionDocument = {
  id: string;
  source: "existing";
  fileId: string;
  fileName: string;
  fileUrl: string;
};

export type SubmissionRecord = {
  namaDistributor: string;
  memilikiArmadaKapal: boolean;
  createdAt: string;
  updatedAt: string;
  dokumenKapal: SubmissionDocument[];
};

export type UploadSessionInput = {
  namaDistributor: string;
  fileName: string;
  mimeType: string;
  size: number;
  origin?: string;
};

export type UploadSessionResult = {
  uploadUrl: string;
  uploadToken: string;
  fileId: string;
};
