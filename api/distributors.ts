import type { VercelRequest, VercelResponse } from "@vercel/node";
import { queryValue, requireMethod, withJsonErrors } from "../server/http.js";
import { createServices } from "../server/services/factory.js";

type DistributorReader = { list(query?: string): Promise<string[]> };

export function createDistributorHandler(service?: DistributorReader) {
  return withJsonErrors(async (request: VercelRequest, response: VercelResponse) => {
    requireMethod(request, response, ["GET"]);
    const reader = service ?? createServices().distributors;
    const items = await reader.list(queryValue(request.query.query));
    response.status(200).json({ items: items.map((namaDistributor) => ({ namaDistributor })) });
  });
}

export default createDistributorHandler();
