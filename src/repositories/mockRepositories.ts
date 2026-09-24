import type { ArmadaKapalSubmission } from "../domain/armadaKapal";
import type {
  ArmadaKapalSubmissionRepository,
  DistributorRepository,
  Repositories,
} from "./contracts";

export const MOCK_DISTRIBUTORS = [
  "ABADI PUTERA WIRAJAYA, PT",
  "ADE LESTARI SEJATI, PT",
  "ANUGERAH BAHARI NUSANTARA, PT",
  "BERKAH LAUT INDONESIA, PT",
  "CAHAYA SAMUDRA ABADI, PT",
  "KARYA MARITIM SEJAHTERA, PT",
  "MITRA PELAYARAN UTAMA, PT",
  "SINAR PESISIR MANDIRI, PT",
];

const existingSubmission: ArmadaKapalSubmission = {
  namaDistributor: "ADE LESTARI SEJATI, PT",
  memilikiArmadaKapal: true,
  dokumenKapal: [
    {
      id: "existing-kapal-1",
      source: "existing",
      fileId: "existing-kapal-1",
      fileName: "bukti-kepemilikan-kapal-ade.pdf",
      fileUrl: "https://drive.google.com/file/d/existing-kapal-1/view",
    },
  ],
  createdAt: "2026-01-15T03:30:00.000Z",
  updatedAt: "2026-01-15T03:30:00.000Z",
};

function copySubmission(submission: ArmadaKapalSubmission): ArmadaKapalSubmission {
  return {
    ...submission,
    dokumenKapal: submission.dokumenKapal.map((document) => ({ ...document })),
  };
}

export class MockDistributorRepository implements DistributorRepository {
  constructor(private readonly distributors = MOCK_DISTRIBUTORS) {}

  async search(query = ""): Promise<string[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return this.distributors.filter((name) =>
      name.toLocaleLowerCase("id-ID").includes(normalizedQuery),
    );
  }
}

export class MockArmadaKapalSubmissionRepository
  implements ArmadaKapalSubmissionRepository
{
  private readonly submissions = new Map<string, ArmadaKapalSubmission>();

  constructor(initialSubmissions: ArmadaKapalSubmission[] = [existingSubmission]) {
    initialSubmissions.forEach((submission) => {
      this.submissions.set(submission.namaDistributor, copySubmission(submission));
    });
  }

  async getByDistributor(namaDistributor: string): Promise<ArmadaKapalSubmission | null> {
    const submission = this.submissions.get(namaDistributor);
    return submission ? copySubmission(submission) : null;
  }

  async create(submission: ArmadaKapalSubmission): Promise<ArmadaKapalSubmission> {
    if (this.submissions.has(submission.namaDistributor)) {
      throw new Error("Data distributor ini sudah tersimpan.");
    }
    const saved = { ...submission, createdAt: new Date().toISOString() };
    this.submissions.set(submission.namaDistributor, copySubmission(saved));
    return copySubmission(saved);
  }

  async update(submission: ArmadaKapalSubmission): Promise<ArmadaKapalSubmission> {
    if (!this.submissions.has(submission.namaDistributor)) {
      throw new Error("Data distributor tidak ditemukan.");
    }
    const previous = this.submissions.get(submission.namaDistributor);
    const saved = {
      ...submission,
      createdAt: previous?.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.submissions.set(submission.namaDistributor, copySubmission(saved));
    return copySubmission(saved);
  }
}

export function createMockRepositories(): Repositories {
  return {
    distributors: new MockDistributorRepository(),
    submissions: new MockArmadaKapalSubmissionRepository(),
  };
}
