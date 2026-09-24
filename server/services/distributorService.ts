import { MASTER_HEADERS } from "../constants.js";
import { ApiError } from "../errors.js";
import type { GoogleGateway } from "../google/gateway.js";

function normalizeHeader(value: string | undefined): string {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}

export class DistributorService {
  constructor(private readonly gateway: GoogleGateway) {}

  async list(query = ""): Promise<string[]> {
    const rows = await this.gateway.readMasterRows();
    if (normalizeHeader(rows[0]?.[0]) !== MASTER_HEADERS[0]) {
      throw new ApiError(503, "CONFIGURATION_ERROR", "Header master distributor tidak sesuai.");
    }
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    const unique = new Set<string>();
    rows.slice(1).forEach((row) => {
      const name = row[0]?.trim();
      if (name) unique.add(name);
    });
    return [...unique].filter((name) =>
      name.toLocaleLowerCase("id-ID").includes(normalizedQuery),
    );
  }

  async assertExists(name: string): Promise<void> {
    const all = await this.list();
    if (!all.includes(name.trim())) {
      throw new ApiError(400, "MASTER_NOT_FOUND", "Nama distributor tidak tersedia pada master.");
    }
  }
}
