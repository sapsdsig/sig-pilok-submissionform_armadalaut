import type { GoogleConfig } from "../config.js";
import {
  SUBMISSION_HEADERS,
  SUBMISSION_KAPAL_HEADERS,
} from "../constants.js";
import { ApiError } from "../errors.js";
import type { GoogleGateway } from "../google/gateway.js";
import type {
  DriveFileRecord,
  SpreadsheetTables,
  SubmissionInput,
  SubmissionRecord,
} from "../models.js";
import { jakartaTimestamp } from "../time.js";
import { DistributorService } from "./distributorService.js";
import { UploadService } from "./uploadService.js";

function headerMatches(row: string[] | undefined, expected: readonly string[]): boolean {
  return expected.every((header, index) => (row?.[index] ?? "").replace(/^\uFEFF/, "").trim() === header);
}

function assertTableHeaders(tables: SpreadsheetTables): void {
  if (
    !headerMatches(tables.submissions[0], SUBMISSION_HEADERS) ||
    !headerMatches(tables.kapal[0], SUBMISSION_KAPAL_HEADERS)
  ) {
    throw new ApiError(503, "CONFIGURATION_ERROR", "Header spreadsheet submission tidak sesuai.");
  }
}

function padRows(rows: string[][], targetLength: number, width: number): string[][] {
  const padded = rows.map((row) => [...row]);
  while (padded.length < targetLength) padded.push(Array<string>(width).fill(""));
  return padded;
}

function safeDriveUrl(value: string | undefined): string {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" &&
      (url.hostname === "drive.google.com" || url.hostname === "docs.google.com")
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function findRecord(tables: SpreadsheetTables, distributor: string): SubmissionRecord | null {
  const parent = tables.submissions.slice(1).find((row) => row[0]?.trim() === distributor);
  if (!parent) return null;
  const documents = tables.kapal
    .slice(1)
    .filter((row) => row[0]?.trim() === distributor && row[2]?.trim())
    .sort((left, right) => Number(left[1]) - Number(right[1]))
    .map((row) => ({
      id: row[2],
      source: "existing" as const,
      fileId: row[2],
      fileName: row[3] ?? "",
      fileUrl: safeDriveUrl(row[4]),
    }));
  return {
    namaDistributor: parent[0],
    memilikiArmadaKapal: parent[1]?.trim().toUpperCase() === "YA",
    createdAt: parent[2] ?? "",
    updatedAt: parent[3] ?? "",
    dokumenKapal: documents,
  } as SubmissionRecord;
}

export class SubmissionService {
  private readonly distributors: DistributorService;
  private readonly uploads: UploadService;

  constructor(
    private readonly gateway: GoogleGateway,
    config: GoogleConfig,
    private readonly now: () => string = jakartaTimestamp,
  ) {
    this.distributors = new DistributorService(gateway);
    this.uploads = new UploadService(gateway, config);
  }

  async getByDistributor(distributor: string): Promise<SubmissionRecord | null> {
    const tables = await this.gateway.readSubmissionTables();
    assertTableHeaders(tables);
    return findRecord(tables, distributor.trim());
  }

  private async verifyDocuments(input: SubmissionInput): Promise<DriveFileRecord[]> {
    const verified: DriveFileRecord[] = [];
    try {
      for (const document of input.dokumenKapal) {
        const file = await this.uploads.verify(document.fileId);
        if (file.appProperties.distributor !== input.namaDistributor) {
          throw new ApiError(400, "UPLOAD_VERIFY_FAILED", "File upload tidak sesuai dengan distributor.");
        }
        verified.push(file);
      }
      return verified;
    } catch (error) {
      await this.cleanupStaged(verified);
      throw error;
    }
  }

  private async cleanupStaged(files: DriveFileRecord[]): Promise<void> {
    await Promise.allSettled(
      files
        .filter((file) => file.appProperties.staged === "true")
        .map((file) => this.gateway.deleteFile(file.id)),
    );
  }

  private normalizedDocuments(input: SubmissionInput, files: DriveFileRecord[]) {
    return input.dokumenKapal.map((document, index) => ({
      fileId: files[index].id,
      fileName: files[index].appProperties.displayName || document.fileName,
      fileUrl: files[index].webViewLink,
    }));
  }

  async create(input: SubmissionInput): Promise<SubmissionRecord> {
    await this.distributors.assertExists(input.namaDistributor);
    const verified = await this.verifyDocuments(input);
    try {
      const tables = await this.gateway.readSubmissionTables();
      assertTableHeaders(tables);
      if (findRecord(tables, input.namaDistributor)) {
        throw new ApiError(409, "SUBMISSION_ALREADY_EXISTS", "Submission distributor sudah tersedia.");
      }
      const timestamp = this.now();
      const documents = this.normalizedDocuments(input, verified);
      const submissions = [
        ...tables.submissions,
        [input.namaDistributor, "YA", timestamp, timestamp],
      ];
      const kapal = [
        ...tables.kapal,
        ...documents.map((document, index) => [
          input.namaDistributor,
          String(index + 1),
          document.fileId,
          document.fileName,
          document.fileUrl,
          timestamp,
          timestamp,
        ]),
      ];
      await this.gateway.writeSubmissionTables({ submissions, kapal });
      await Promise.allSettled([this.gateway.markFilesCommitted(verified.map((file) => file.id))]);
      return {
        namaDistributor: input.namaDistributor,
        memilikiArmadaKapal: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        dokumenKapal: documents.map((document) => ({
          id: document.fileId,
          source: "existing",
          ...document,
        })),
      };
    } catch (error) {
      await this.cleanupStaged(verified);
      throw error;
    }
  }

  async update(input: SubmissionInput): Promise<SubmissionRecord> {
    await this.distributors.assertExists(input.namaDistributor);
    const verified = await this.verifyDocuments(input);
    try {
      const tables = await this.gateway.readSubmissionTables();
      assertTableHeaders(tables);
      const current = findRecord(tables, input.namaDistributor);
      if (!current) {
        throw new ApiError(404, "SUBMISSION_NOT_FOUND", "Submission distributor tidak ditemukan.");
      }
      const timestamp = this.now();
      const documents = this.normalizedDocuments(input, verified);
      const newSubmissionRows = [
        tables.submissions[0],
        ...tables.submissions.slice(1).map((row) =>
          row[0]?.trim() === input.namaDistributor
            ? [input.namaDistributor, "YA", current.createdAt, timestamp]
            : row,
        ),
      ];
      const retainedChildren = tables.kapal
        .slice(1)
        .filter((row) => row[0]?.trim() !== input.namaDistributor);
      const newChildren = documents.map((document, index) => [
        input.namaDistributor,
        String(index + 1),
        document.fileId,
        document.fileName,
        document.fileUrl,
        current.createdAt,
        timestamp,
      ]);
      const newKapalRows = [tables.kapal[0], ...retainedChildren, ...newChildren];
      const nextTables = {
        submissions: padRows(
          newSubmissionRows,
          Math.max(newSubmissionRows.length, tables.submissions.length),
          SUBMISSION_HEADERS.length,
        ),
        kapal: padRows(
          newKapalRows,
          Math.max(newKapalRows.length, tables.kapal.length),
          SUBMISSION_KAPAL_HEADERS.length,
        ),
      };
      const finalIds = new Set(documents.map((document) => document.fileId));
      const removedIds = current.dokumenKapal
        .map((document) => document.fileId)
        .filter((fileId) => !finalIds.has(fileId));

      await this.gateway.writeSubmissionTables(nextTables);
      await Promise.allSettled([
        this.gateway.markFilesCommitted(
          verified.filter((file) => file.appProperties.staged === "true").map((file) => file.id),
        ),
        ...removedIds.map(async (fileId) => {
          const oldFile = await this.uploads.verify(fileId);
          await this.gateway.deleteFile(oldFile.id);
        }),
      ]);
      return {
        namaDistributor: input.namaDistributor,
        memilikiArmadaKapal: true,
        createdAt: current.createdAt,
        updatedAt: timestamp,
        dokumenKapal: documents.map((document) => ({
          id: document.fileId,
          source: "existing",
          ...document,
        })),
      };
    } catch (error) {
      await this.cleanupStaged(verified);
      throw error;
    }
  }
}
