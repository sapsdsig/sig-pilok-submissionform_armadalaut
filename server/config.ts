import { ApiError } from "./errors.js";
import { loadServerEnvironment } from "./environment.js";

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  masterSpreadsheetId: string;
  submissionSpreadsheetId: string;
  kapalFolderId: string;
  masterDistributorSheet: string;
  submissionSheet: string;
  submissionKapalSheet: string;
};

export const REQUIRED_GOOGLE_ENV_NAMES = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_MASTER_SPREADSHEET_ID",
  "GOOGLE_SUBMISSION_SPREADSHEET_ID",
  "GOOGLE_KAPAL_FOLDER_ID",
  "GOOGLE_MASTER_DISTRIBUTOR_SHEET",
  "GOOGLE_SUBMISSION_SHEET",
  "GOOGLE_SUBMISSION_KAPAL_SHEET",
] as const;

export function getMissingGoogleEnvironmentVariables(
  environment: NodeJS.ProcessEnv,
): string[] {
  return REQUIRED_GOOGLE_ENV_NAMES.filter((name) => !environment[name]?.trim());
}

export function getGoogleConfig(environment?: NodeJS.ProcessEnv): GoogleConfig {
  if (!environment) loadServerEnvironment(process.cwd());
  const source = environment ?? process.env;
  const missing = getMissingGoogleEnvironmentVariables(source);
  if (missing.length) {
    throw new ApiError(
      503,
      "CONFIGURATION_ERROR",
      `Konfigurasi layanan Google belum lengkap. Variable belum tersedia: ${missing.join(", ")}.`,
    );
  }

  return {
    clientId: source.GOOGLE_CLIENT_ID!.trim(),
    clientSecret: source.GOOGLE_CLIENT_SECRET!.trim(),
    refreshToken: source.GOOGLE_REFRESH_TOKEN!.trim(),
    masterSpreadsheetId: source.GOOGLE_MASTER_SPREADSHEET_ID!.trim(),
    submissionSpreadsheetId: source.GOOGLE_SUBMISSION_SPREADSHEET_ID!.trim(),
    kapalFolderId: source.GOOGLE_KAPAL_FOLDER_ID!.trim(),
    masterDistributorSheet: source.GOOGLE_MASTER_DISTRIBUTOR_SHEET!.trim(),
    submissionSheet: source.GOOGLE_SUBMISSION_SHEET!.trim(),
    submissionKapalSheet: source.GOOGLE_SUBMISSION_KAPAL_SHEET!.trim(),
  };
}
