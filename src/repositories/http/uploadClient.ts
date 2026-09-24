import { ApiClientError, apiRequest } from "./apiClient";

type SessionResponse = { uploadUrl: string; uploadToken: string; fileId: string };
type GoogleUploadResponse = { id?: string };
type VerifyResponse = {
  ok: true;
  file: { fileId: string; fileName: string; fileUrl: string };
};

export type StagedUpload = VerifyResponse["file"] & { uploadToken: string };

function uploadToGoogle(uploadUrl: string, file: File): Promise<GoogleUploadResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("Content-Range", `bytes 0-${file.size - 1}/${file.size}`);
    request.onload = () => {
      if (request.status !== 200 && request.status !== 201) {
        reject(new ApiClientError("Upload dokumen ke Google Drive belum berhasil.", "UPLOAD_FAILED", request.status));
        return;
      }
      try {
        resolve(JSON.parse(request.responseText) as GoogleUploadResponse);
      } catch {
        reject(new ApiClientError("Respons upload Google Drive tidak valid.", "UPLOAD_INVALID_RESPONSE"));
      }
    };
    request.onerror = () => reject(new ApiClientError("Koneksi terputus saat mengunggah dokumen.", "UPLOAD_NETWORK_ERROR"));
    request.onabort = () => reject(new ApiClientError("Upload dokumen dibatalkan.", "UPLOAD_ABORTED"));
    request.send(file);
  });
}

export async function uploadDocument(namaDistributor: string, file: File): Promise<StagedUpload> {
  const session = await apiRequest<SessionResponse>("/api/uploads/session", {
    method: "POST",
    body: JSON.stringify({
      namaDistributor,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    }),
  });
  let uploaded: GoogleUploadResponse;
  try {
    uploaded = await uploadToGoogle(session.uploadUrl, file);
  } catch (uploadError) {
    try {
      const recovered = await apiRequest<VerifyResponse>("/api/uploads/verify", {
        method: "POST",
        body: JSON.stringify({ fileId: session.fileId, uploadToken: session.uploadToken }),
      });
      return { ...recovered.file, uploadToken: session.uploadToken };
    } catch {
      throw uploadError;
    }
  }
  const fileId = uploaded.id || session.fileId;
  const verified = await apiRequest<VerifyResponse>("/api/uploads/verify", {
    method: "POST",
    body: JSON.stringify({ fileId, uploadToken: session.uploadToken }),
  });
  return { ...verified.file, uploadToken: session.uploadToken };
}

export async function cleanupUploads(files: StagedUpload[]): Promise<void> {
  if (!files.length) return;
  await apiRequest<{ ok: true }>("/api/uploads/cleanup", {
    method: "POST",
    body: JSON.stringify({
      files: files.map(({ fileId, uploadToken }) => ({ fileId, uploadToken })),
    }),
  });
}
