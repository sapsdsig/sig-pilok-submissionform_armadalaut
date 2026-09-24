// @vitest-environment node
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import { createDistributorHandler } from "../../api/distributors.js";
import healthHandler from "../../api/health.js";
import { createExistingSubmissionHandler } from "../../api/submissions/by-distributor.js";
import { createSubmissionHandler } from "../../api/submissions/index.js";
import { ApiError } from "../errors.js";
import { withJsonErrors } from "../http.js";

function request(method: string, query: Record<string, string> = {}): VercelRequest {
  return { method, query, headers: {} } as unknown as VercelRequest;
}

function response() {
  const result = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string | string[]>,
  };
  const api = {
    setHeader: vi.fn((name: string, value: string | string[]) => { result.headers[name] = value; return api; }),
    status: vi.fn((status: number) => { result.statusCode = status; return api; }),
    json: vi.fn((body: unknown) => { result.body = body; return api; }),
  } as unknown as VercelResponse;
  return { api, result };
}

describe("API handlers", () => {
  it("returns distributor API items", async () => {
    const handler = createDistributorHandler({ list: vi.fn().mockResolvedValue(["ABADI PUTERA WIRAJAYA, PT"]) });
    const target = response();
    await handler(request("GET", { query: "ABADI" }), target.api);
    expect(target.result.statusCode).toBe(200);
    expect(target.result.body).toEqual({ items: [{ namaDistributor: "ABADI PUTERA WIRAJAYA, PT" }] });
  });

  it("returns exists false for missing submission", async () => {
    const handler = createExistingSubmissionHandler({ getByDistributor: vi.fn().mockResolvedValue(null) });
    const target = response();
    await handler(request("GET", { namaDistributor: "ABADI" }), target.api);
    expect(target.result.body).toEqual({ exists: false });
  });

  it("returns an existing submission", async () => {
    const submission = { namaDistributor: "ABADI", dokumenKapal: [] };
    const handler = createExistingSubmissionHandler({ getByDistributor: vi.fn().mockResolvedValue(submission) });
    const target = response();
    await handler(request("GET", { namaDistributor: "ABADI" }), target.api);
    expect(target.result.body).toEqual({ exists: true, submission });
  });

  it("returns JSON health response", async () => {
    const target = response();
    await healthHandler(request("GET"), target.api);
    expect(target.result.statusCode).toBe(200);
    expect(target.result.body).toEqual({ ok: true, runtime: "vercel" });
  });

  it("returns JSON 405 for unsupported method", async () => {
    const target = response();
    await healthHandler(request("POST"), target.api);
    expect(target.result.statusCode).toBe(405);
    expect(target.result.body).toEqual({
      error: { code: "METHOD_NOT_ALLOWED", message: "Metode HTTP tidak didukung." },
    });
  });

  it("maps duplicate submission to JSON 409", async () => {
    const handler = createSubmissionHandler({
      create: vi.fn().mockRejectedValue(
        new ApiError(409, "SUBMISSION_ALREADY_EXISTS", "Submission distributor sudah tersedia."),
      ),
      update: vi.fn(),
    });
    const apiRequest = request("POST");
    apiRequest.body = {
      namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
      memilikiArmadaKapal: true,
      dokumenKapal: [{ fileId: "file-one", fileName: "one.pdf" }],
    };
    const target = response();
    await handler(apiRequest, target.api);
    expect(target.result.statusCode).toBe(409);
    expect(target.result.body).toEqual({
      error: {
        code: "SUBMISSION_ALREADY_EXISTS",
        message: "Submission distributor sudah tersedia.",
      },
    });
  });

  it("sanitizes unexpected Google errors", async () => {
    const handler = withJsonErrors(() => { throw new Error("raw credential and stack"); });
    const target = response();
    await handler(request("GET"), target.api);
    expect(target.result.statusCode).toBe(500);
    expect(target.result.body).toEqual({
      error: { code: "GOOGLE_API_ERROR", message: "Layanan Google sedang mengalami kendala." },
    });
  });
});
