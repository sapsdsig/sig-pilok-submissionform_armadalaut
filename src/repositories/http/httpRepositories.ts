import type {
  ArmadaKapalSubmission,
  ExistingKapalDocument,
  KapalDocument,
} from "../../domain/armadaKapal";
import type {
  ArmadaKapalSubmissionRepository,
  DistributorRepository,
  Repositories,
  SaveOptions,
} from "../contracts";
import { ApiClientError, apiRequest } from "./apiClient";
import { cleanupUploads, uploadDocument, type StagedUpload } from "./uploadClient";

type SubmissionDto = {
  namaDistributor: string;
  memilikiArmadaKapal: boolean;
  createdAt: string;
  updatedAt: string;
  dokumenKapal: Array<{
    id: string;
    source: "existing";
    fileId: string;
    fileName: string;
    fileUrl: string;
  }>;
};

type SubmissionPayload = {
  namaDistributor: string;
  memilikiArmadaKapal: boolean;
  dokumenKapal: Array<{ fileId: string; fileName: string; fileUrl?: string }>;
};

function mapSubmission(dto: SubmissionDto): ArmadaKapalSubmission {
  return {
    namaDistributor: dto.namaDistributor,
    memilikiArmadaKapal: dto.memilikiArmadaKapal,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    dokumenKapal: dto.dokumenKapal.map((document) => ({ ...document })),
  };
}

export class HttpDistributorRepository implements DistributorRepository {
  async search(query = ""): Promise<string[]> {
    const response = await apiRequest<{ items: Array<{ namaDistributor: string }> }>(
      `/api/distributors?query=${encodeURIComponent(query.trim())}`,
    );
    return response.items.map((item) => item.namaDistributor);
  }
}

export class HttpArmadaKapalSubmissionRepository implements ArmadaKapalSubmissionRepository {
  async getByDistributor(namaDistributor: string): Promise<ArmadaKapalSubmission | null> {
    const response = await apiRequest<
      { exists: false } | { exists: true; submission: SubmissionDto }
    >(`/api/submissions/by-distributor?namaDistributor=${encodeURIComponent(namaDistributor)}`);
    return response.exists ? mapSubmission(response.submission) : null;
  }

  create(submission: ArmadaKapalSubmission, options?: SaveOptions): Promise<ArmadaKapalSubmission> {
    return this.save("POST", submission, options);
  }

  update(submission: ArmadaKapalSubmission, options?: SaveOptions): Promise<ArmadaKapalSubmission> {
    return this.save("PUT", submission, options);
  }

  private async save(
    method: "POST" | "PUT",
    submission: ArmadaKapalSubmission,
    options?: SaveOptions,
  ): Promise<ArmadaKapalSubmission> {
    const staged: StagedUpload[] = [];
    try {
      const submissionDocuments = submission.memilikiArmadaKapal ? submission.dokumenKapal : [];
      if (submissionDocuments.some((document) => document.source === "new")) {
        options?.onStageChange?.("uploading");
      }
      const documents = [] as SubmissionPayload["dokumenKapal"];
      for (const document of submissionDocuments) {
        if (document.source === "new") {
          const uploaded = await uploadDocument(submission.namaDistributor, document.file);
          staged.push(uploaded);
          documents.push({
            fileId: uploaded.fileId,
            fileName: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
          });
        } else {
          documents.push(this.existingPayload(document));
        }
      }
      options?.onStageChange?.("saving");
      const payload: SubmissionPayload = {
        namaDistributor: submission.namaDistributor,
        memilikiArmadaKapal: submission.memilikiArmadaKapal,
        dokumenKapal: documents,
      };
      const response = await apiRequest<{ submission: SubmissionDto }>("/api/submissions", {
        method,
        body: JSON.stringify(payload),
      });
      return mapSubmission(response.submission);
    } catch (error) {
      try {
        await cleanupUploads(staged);
      } catch {
        // Server-side submission handling also attempts staged cleanup.
      }
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError("Proses penyimpanan belum berhasil.");
    }
  }

  private existingPayload(document: ExistingKapalDocument): SubmissionPayload["dokumenKapal"][number] {
    if (!document.fileId) {
      throw new ApiClientError("Metadata dokumen tersimpan tidak lengkap.", "INVALID_EXISTING_DOCUMENT");
    }
    return {
      fileId: document.fileId,
      fileName: document.fileName,
      ...(document.fileUrl ? { fileUrl: document.fileUrl } : {}),
    };
  }
}

export function createHttpRepositories(): Repositories {
  return {
    distributors: new HttpDistributorRepository(),
    submissions: new HttpArmadaKapalSubmissionRepository(),
  };
}

export function isExistingDocument(document: KapalDocument): document is ExistingKapalDocument {
  return document.source === "existing";
}
