import { google } from "googleapis";
import type { GoogleConfig } from "../config.js";
import { ApiError } from "../errors.js";

export function createGoogleAuth(config: GoogleConfig) {
  const client = new google.auth.OAuth2(config.clientId, config.clientSecret);
  client.setCredentials({ refresh_token: config.refreshToken });
  return client;
}

export async function obtainAccessToken(config: GoogleConfig): Promise<string> {
  const token = await createGoogleAuth(config).getAccessToken();
  if (!token.token) {
    throw new ApiError(503, "GOOGLE_API_ERROR", "Google OAuth tidak menghasilkan access token.");
  }
  return token.token;
}
