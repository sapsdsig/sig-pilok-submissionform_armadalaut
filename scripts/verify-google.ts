import {
  DRIVE_FOLDER_MIME_TYPE,
  MASTER_HEADERS,
  SUBMISSION_HEADERS,
  SUBMISSION_KAPAL_HEADERS,
} from "../server/constants.js";
import {
  getGoogleConfig,
  getMissingGoogleEnvironmentVariables,
} from "../server/config.js";
import { loadServerEnvironment } from "../server/environment.js";
import { RealGoogleGateway } from "../server/google/googleGateway.js";

class VerificationFailure extends Error {}

function headerMatches(actual: string[] | undefined, expected: readonly string[]): boolean {
  return expected.every(
    (value, index) => (actual?.[index] ?? "").replace(/^\uFEFF/, "").trim() === value,
  );
}

function pass(label: string): void {
  process.stdout.write(`[PASS] ${label}\n`);
}

function fail(label: string, message: string): never {
  process.stderr.write(`[FAIL] ${label}\n${message}\n`);
  process.exit(1);
}

async function verifyStep(
  label: string,
  action: () => Promise<void>,
  fallbackMessage: string,
): Promise<void> {
  try {
    await action();
    pass(label);
  } catch (error) {
    const message = error instanceof VerificationFailure ? error.message : fallbackMessage;
    fail(label, message);
  }
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  loadServerEnvironment(projectRoot);
  const missing = getMissingGoogleEnvironmentVariables(process.env);
  if (missing.length) {
    fail(
      "Configuration",
      `Missing environment variables:\n${missing.map((name) => `- ${name}`).join("\n")}`,
    );
  }
  pass("Configuration");

  const config = getGoogleConfig();
  const gateway = new RealGoogleGateway(config);

  await verifyStep(
    "Google OAuth",
    async () => {
      const accessToken = await gateway.getAccessToken();
      const tokenInfo = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!tokenInfo.ok) {
        throw new VerificationFailure("Access token tidak dapat diverifikasi.");
      }
      const info = await tokenInfo.json() as { scope?: string };
      const scopes = new Set((info.scope ?? "").split(" "));
      const hasSheets = scopes.has("https://www.googleapis.com/auth/spreadsheets");
      const hasDrive = scopes.has("https://www.googleapis.com/auth/drive") ||
        scopes.has("https://www.googleapis.com/auth/drive.file");
      if (!hasSheets || !hasDrive) {
        throw new VerificationFailure("Scope Google Sheets/Drive belum mencukupi.");
      }
    },
    "OAuth credential atau refresh token tidak valid.",
  );

  await verifyStep(
    "Master Distributor",
    async () => {
      const sheetNames = await gateway.getSpreadsheetSheetNames(config.masterSpreadsheetId);
      if (!sheetNames.includes(config.masterDistributorSheet)) {
        throw new VerificationFailure(
          `Sheet/tab '${config.masterDistributorSheet}' tidak ditemukan pada spreadsheet master.`,
        );
      }
      const rows = await gateway.readMasterRows();
      if (!headerMatches(rows[0], MASTER_HEADERS)) {
        throw new VerificationFailure("Header master harus berisi 'Nama Distributor'.");
      }
    },
    "Spreadsheet master tidak dapat diakses. Periksa ID dan permission.",
  );

  await verifyStep(
    "Submission",
    async () => {
      const sheetNames = await gateway.getSpreadsheetSheetNames(config.submissionSpreadsheetId);
      if (!sheetNames.includes(config.submissionSheet)) {
        throw new VerificationFailure(
          `Sheet/tab '${config.submissionSheet}' tidak ditemukan pada spreadsheet submission.`,
        );
      }
      const tables = await gateway.readSubmissionTables();
      if (!headerMatches(tables.submissions[0], SUBMISSION_HEADERS)) {
        throw new VerificationFailure(
          `Header sheet submission tidak sesuai contract.\nExpected: ${SUBMISSION_HEADERS.join(" | ")}\nActual: ${(tables.submissions[0] ?? []).join(" | ")}`,
        );
      }
    },
    "Sheet submission tidak dapat diakses. Periksa spreadsheet ID dan permission.",
  );

  await verifyStep(
    "Submission Kapal",
    async () => {
      const sheetNames = await gateway.getSpreadsheetSheetNames(config.submissionSpreadsheetId);
      if (!sheetNames.includes(config.submissionKapalSheet)) {
        throw new VerificationFailure(
          `Sheet/tab '${config.submissionKapalSheet}' tidak ditemukan pada spreadsheet submission.`,
        );
      }
      const tables = await gateway.readSubmissionTables();
      if (!headerMatches(tables.kapal[0], SUBMISSION_KAPAL_HEADERS)) {
        throw new VerificationFailure(
          `Header sheet submission_kapal tidak sesuai contract.\nExpected: ${SUBMISSION_KAPAL_HEADERS.join(" | ")}\nActual: ${(tables.kapal[0] ?? []).join(" | ")}`,
        );
      }
    },
    "Sheet submission_kapal tidak dapat diakses. Periksa nama tab dan permission.",
  );

  await verifyStep(
    "Drive Folder",
    async () => {
      const folder = await gateway.getFolder();
      if (folder.id !== config.kapalFolderId) {
        throw new VerificationFailure("Drive folder ID tidak sesuai konfigurasi.");
      }
      if (folder.mimeType !== DRIVE_FOLDER_MIME_TYPE) {
        throw new VerificationFailure("GOOGLE_KAPAL_FOLDER_ID bukan sebuah Google Drive folder.");
      }
      if (folder.trashed) {
        throw new VerificationFailure("Google Drive folder berada di trash.");
      }
    },
    "Drive folder tidak dapat diakses. Periksa folder ID dan permission.",
  );

  process.stdout.write("\nGoogle verification completed successfully.\n");
}

void main();
