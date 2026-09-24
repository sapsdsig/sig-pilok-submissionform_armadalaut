import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ApiError } from "../../server/errors.js";
import { queryValue, requireMethod, withJsonErrors } from "../../server/http.js";
import { createServices } from "../../server/services/factory.js";

type SubmissionReader = {
  getByDistributor(distributor: string): Promise<unknown | null>;
};

export function createExistingSubmissionHandler(service?: SubmissionReader) {
  return withJsonErrors(async (request: VercelRequest, response: VercelResponse) => {
    requireMethod(request, response, ["GET"]);
    const distributor = queryValue(request.query.namaDistributor).trim();
    if (!distributor) {
      throw new ApiError(400, "VALIDATION_ERROR", "Nama distributor wajib diisi.");
    }
    const submission = await (service ?? createServices().submissions).getByDistributor(distributor);
    response.status(200).json(submission ? { exists: true, submission } : { exists: false });
  });
}

export default createExistingSubmissionHandler();
