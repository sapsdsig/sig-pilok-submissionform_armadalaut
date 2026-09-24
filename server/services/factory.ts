import { getGoogleConfig } from "../config.js";
import { RealGoogleGateway } from "../google/googleGateway.js";
import { DistributorService } from "./distributorService.js";
import { SubmissionService } from "./submissionService.js";
import { UploadService } from "./uploadService.js";

export function createServices() {
  const config = getGoogleConfig();
  const gateway = new RealGoogleGateway(config);
  return {
    config,
    gateway,
    distributors: new DistributorService(gateway),
    submissions: new SubmissionService(gateway, config),
    uploads: new UploadService(gateway, config),
  };
}
