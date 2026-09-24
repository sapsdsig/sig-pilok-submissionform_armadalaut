import type { ArmadaKapalSubmission } from "../domain/armadaKapal";

export interface DistributorRepository {
  search(query?: string): Promise<string[]>;
}

export interface ArmadaKapalSubmissionRepository {
  getByDistributor(namaDistributor: string): Promise<ArmadaKapalSubmission | null>;
  create(submission: ArmadaKapalSubmission, options?: SaveOptions): Promise<ArmadaKapalSubmission>;
  update(submission: ArmadaKapalSubmission, options?: SaveOptions): Promise<ArmadaKapalSubmission>;
}

export type SaveStage = "uploading" | "saving";

export type SaveOptions = {
  onStageChange?: (stage: SaveStage) => void;
};

export type Repositories = {
  distributors: DistributorRepository;
  submissions: ArmadaKapalSubmissionRepository;
};
