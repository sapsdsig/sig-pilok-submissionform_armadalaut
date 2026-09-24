import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpArmadaKapalSubmissionRepository, HttpDistributorRepository } from "../repositories/http/httpRepositories";

class SuccessfulUploadRequest {
  status = 201;
  responseText = JSON.stringify({ id: "drive-new" });
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn(() => this.onload?.());
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("frontend HTTP repositories", () => {
  it("maps distributor API results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ items: [{ namaDistributor: "ABADI PUTERA WIRAJAYA, PT" }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(new HttpDistributorRepository().search(" ABADI ")).resolves.toEqual([
      "ABADI PUTERA WIRAJAYA, PT",
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/distributors?query=ABADI",
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) }),
    );
  });

  it("runs session, direct upload, verify, and final create in order", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      if (url === "/api/uploads/session") {
        return jsonResponse({ uploadUrl: "https://upload.google.test/session", uploadToken: "token-one", fileId: "drive-new" }, 201);
      }
      if (url === "/api/uploads/verify") {
        return jsonResponse({
          ok: true,
          file: {
            fileId: "drive-new",
            fileName: "kapal.pdf",
            fileUrl: "https://drive.google.com/file/d/drive-new/view",
          },
        });
      }
      if (url === "/api/submissions") {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
          memilikiArmadaKapal: true,
          dokumenKapal: [{ fileId: "drive-new", fileName: "kapal.pdf" }],
        });
        return jsonResponse({
          submission: {
            namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
            memilikiArmadaKapal: true,
            createdAt: "23-09-2026 11:15:42",
            updatedAt: "23-09-2026 11:15:42",
            dokumenKapal: [{
              id: "drive-new",
              source: "existing",
              fileId: "drive-new",
              fileName: "kapal.pdf",
              fileUrl: "https://drive.google.com/file/d/drive-new/view",
            }],
          },
        }, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("XMLHttpRequest", SuccessfulUploadRequest as unknown as typeof XMLHttpRequest);
    const stages: string[] = [];
    const result = await new HttpArmadaKapalSubmissionRepository().create({
      namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
      memilikiArmadaKapal: true,
      dokumenKapal: [{
        id: "local-one",
        source: "new",
        file: new File(["pdf"], "kapal.pdf", { type: "application/pdf" }),
      }],
    }, { onStageChange: (stage) => stages.push(stage) });
    expect(calls).toEqual([
      "/api/uploads/session",
      "/api/uploads/verify",
      "/api/submissions",
    ]);
    expect(stages).toEqual(["uploading", "saving"]);
    expect(result.dokumenKapal[0]).toMatchObject({ source: "existing", fileId: "drive-new" });
  });

  it("maps an existing TIDAK submission without assuming YA", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      exists: true,
      submission: {
        namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
        memilikiArmadaKapal: false,
        createdAt: "23-09-2026 11:15:42",
        updatedAt: "23-09-2026 11:15:42",
        dokumenKapal: [],
      },
    })));
    await expect(
      new HttpArmadaKapalSubmissionRepository().getByDistributor("ABADI PUTERA WIRAJAYA, PT"),
    ).resolves.toMatchObject({ memilikiArmadaKapal: false, dokumenKapal: [] });
  });

  it("creates TIDAK directly without upload and forces an empty document payload", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      expect(JSON.parse(String(init?.body))).toEqual({
        namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
        memilikiArmadaKapal: false,
        dokumenKapal: [],
      });
      return jsonResponse({
        submission: {
          namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
          memilikiArmadaKapal: false,
          createdAt: "23-09-2026 11:15:42",
          updatedAt: "23-09-2026 11:15:42",
          dokumenKapal: [],
        },
      }, 201);
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await new HttpArmadaKapalSubmissionRepository().create({
      namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
      memilikiArmadaKapal: false,
      dokumenKapal: [{
        id: "unused-local",
        source: "new",
        file: new File(["pdf"], "unused.pdf", { type: "application/pdf" }),
      }],
    });
    expect(calls).toEqual(["/api/submissions"]);
    expect(result).toMatchObject({ memilikiArmadaKapal: false, dokumenKapal: [] });
  });

  it("requests staged cleanup when final create fails", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url === "/api/uploads/session") {
        return jsonResponse({ uploadUrl: "https://upload.google.test/session", uploadToken: "token-one", fileId: "drive-new" }, 201);
      }
      if (url === "/api/uploads/verify") {
        return jsonResponse({
          ok: true,
          file: { fileId: "drive-new", fileName: "kapal.pdf", fileUrl: "https://drive.google.com/file/d/drive-new/view" },
        });
      }
      if (url === "/api/submissions") {
        return jsonResponse({ error: { code: "GOOGLE_API_ERROR", message: "Penyimpanan gagal." } }, 503);
      }
      if (url === "/api/uploads/cleanup") return jsonResponse({ ok: true });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("XMLHttpRequest", SuccessfulUploadRequest as unknown as typeof XMLHttpRequest);
    await expect(new HttpArmadaKapalSubmissionRepository().create({
      namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
      memilikiArmadaKapal: true,
      dokumenKapal: [{
        id: "local-one",
        source: "new",
        file: new File(["pdf"], "kapal.pdf", { type: "application/pdf" }),
      }],
    })).rejects.toThrow("Penyimpanan gagal.");
    expect(calls.at(-1)).toBe("/api/uploads/cleanup");
  });
});
