export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code = "UNKNOWN_ERROR",
    public readonly status = 0,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ApiErrorBody = { error?: { code?: string; message?: string } };

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError("Tidak dapat terhubung ke server.", "NETWORK_ERROR");
  }

  let body: T | ApiErrorBody;
  try {
    body = await response.json() as T | ApiErrorBody;
  } catch {
    throw new ApiClientError("Server mengembalikan respons yang tidak valid.", "INVALID_RESPONSE", response.status);
  }
  if (!response.ok) {
    const error = (body as ApiErrorBody).error;
    throw new ApiClientError(
      error?.message ?? "Permintaan belum berhasil.",
      error?.code,
      response.status,
    );
  }
  return body as T;
}
