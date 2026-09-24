// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SUBMISSION_HEADERS, SUBMISSION_KAPAL_HEADERS } from "../constants.js";
import { getGoogleConfig } from "../config.js";
import { DistributorService } from "../services/distributorService.js";
import { SubmissionService } from "../services/submissionService.js";
import { UploadService } from "../services/uploadService.js";
import { parseSubmissionInput } from "../validation.js";
import { MockGoogleGateway, TEST_CONFIG, driveFile } from "./mockGateway.js";

const DISTRIBUTOR = "ABADI PUTERA WIRAJAYA, PT";
const CREATED = "20-09-2026 08:00:00";
const UPDATED = "23-09-2026 11:15:42";

function existingTables(gateway: MockGoogleGateway): void {
  gateway.tables = {
    submissions: [[...SUBMISSION_HEADERS], [DISTRIBUTOR, "YA", CREATED, CREATED]],
    kapal: [
      [...SUBMISSION_KAPAL_HEADERS],
      [DISTRIBUTOR, "1", "file-a", "a.pdf", "https://drive.google.com/file/d/file-a/view", CREATED, CREATED],
      [DISTRIBUTOR, "2", "file-b", "b.pdf", "https://drive.google.com/file/d/file-b/view", CREATED, CREATED],
    ],
  };
  gateway.files.set("file-a", driveFile("file-a", { appProperties: { pilokWorkflow: "armada-kapal", staged: "false", displayName: "a.pdf" } }));
  gateway.files.set("file-b", driveFile("file-b", { appProperties: { pilokWorkflow: "armada-kapal", staged: "false", displayName: "b.pdf" } }));
}

describe("Google-backed services", () => {
  it("rejects incomplete Google configuration without exposing values", () => {
    expect(() => getGoogleConfig({})).toThrow("Konfigurasi layanan Google belum lengkap.");
  });

  it("returns distributor data and removes empty/duplicate rows", async () => {
    const gateway = new MockGoogleGateway();
    gateway.masterRows.push([""], [DISTRIBUTOR]);
    await expect(new DistributorService(gateway).list()).resolves.toEqual([
      DISTRIBUTOR,
      "ADE LESTARI SEJATI, PT",
    ]);
  });

  it("searches distributor case-insensitively with trimmed query", async () => {
    const service = new DistributorService(new MockGoogleGateway());
    await expect(service.list("  lestari sejati ")).resolves.toEqual(["ADE LESTARI SEJATI, PT"]);
  });

  it("rejects an invalid master header", async () => {
    const gateway = new MockGoogleGateway();
    gateway.masterRows[0] = ["Distributor"];
    await expect(new DistributorService(gateway).list()).rejects.toMatchObject({
      code: "CONFIGURATION_ERROR",
      status: 503,
    });
  });

  it("returns null when an existing submission is not found", async () => {
    const service = new SubmissionService(new MockGoogleGateway(), TEST_CONFIG);
    await expect(service.getByDistributor(DISTRIBUTOR)).resolves.toBeNull();
  });

  it("loads existing submission with fileUrl", async () => {
    const gateway = new MockGoogleGateway();
    existingTables(gateway);
    const result = await new SubmissionService(gateway, TEST_CONFIG).getByDistributor(DISTRIBUTOR);
    expect(result?.dokumenKapal[0]).toMatchObject({
      fileId: "file-a",
      fileUrl: "https://drive.google.com/file/d/file-a/view",
    });
  });

  it("creates parent and child rows successfully", async () => {
    const gateway = new MockGoogleGateway();
    gateway.files.set("new-file", driveFile("new-file"));
    const result = await new SubmissionService(gateway, TEST_CONFIG, () => UPDATED).create({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: true,
      dokumenKapal: [{ fileId: "new-file", fileName: "client-name.pdf" }],
    });
    expect(result.createdAt).toBe(UPDATED);
    expect(gateway.tables.submissions[1]).toEqual([DISTRIBUTOR, "YA", UPDATED, UPDATED]);
    expect(gateway.tables.kapal[1].slice(0, 5)).toEqual([
      DISTRIBUTOR,
      "1",
      "new-file",
      "new-file.pdf",
      "https://drive.google.com/file/d/new-file/view",
    ]);
  });

  it("rejects duplicate create with 409", async () => {
    const gateway = new MockGoogleGateway();
    existingTables(gateway);
    gateway.files.set("new-file", driveFile("new-file"));
    await expect(new SubmissionService(gateway, TEST_CONFIG).create({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: true,
      dokumenKapal: [{ fileId: "new-file", fileName: "new.pdf" }],
    })).rejects.toMatchObject({ code: "SUBMISSION_ALREADY_EXISTS", status: 409 });
  });

  it("rejects a distributor outside the master", async () => {
    const gateway = new MockGoogleGateway();
    await expect(new SubmissionService(gateway, TEST_CONFIG).create({
      namaDistributor: "TIDAK TERDAFTAR, PT",
      memilikiArmadaKapal: true,
      dokumenKapal: [{ fileId: "missing", fileName: "missing.pdf" }],
    })).rejects.toMatchObject({ code: "MASTER_NOT_FOUND" });
  });

  it("validates ownership must be true", () => {
    expect(() => parseSubmissionInput({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: false,
      dokumenKapal: [{ fileId: "one", fileName: "one.pdf" }],
    })).toThrow("Payload submission tidak valid");
  });

  it("validates document count cannot be zero", () => {
    expect(() => parseSubmissionInput({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: true,
      dokumenKapal: [],
    })).toThrow("Payload submission tidak valid");
  });

  it("validates document count cannot exceed ten", () => {
    expect(() => parseSubmissionInput({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: true,
      dokumenKapal: Array.from({ length: 11 }, (_, index) => ({ fileId: String(index), fileName: `${index}.pdf` })),
    })).toThrow("Payload submission tidak valid");
  });

  it("rejects invalid upload MIME", async () => {
    const service = new UploadService(new MockGoogleGateway(), TEST_CONFIG);
    await expect(service.createSession({ namaDistributor: DISTRIBUTOR, fileName: "bad.txt", mimeType: "text/plain", size: 10 }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects upload over 5 MB", async () => {
    const service = new UploadService(new MockGoogleGateway(), TEST_CONFIG);
    await expect(service.createSession({ namaDistributor: DISTRIBUTOR, fileName: "large.pdf", mimeType: "application/pdf", size: 5 * 1024 * 1024 + 1 }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("verifies a valid Drive upload", async () => {
    const gateway = new MockGoogleGateway();
    const file = driveFile("valid");
    gateway.files.set(file.id, file);
    await expect(new UploadService(gateway, TEST_CONFIG).verify(file.id)).resolves.toMatchObject({ id: "valid" });
  });

  it("rejects a Drive file in the wrong folder", async () => {
    const gateway = new MockGoogleGateway();
    gateway.files.set("wrong", driveFile("wrong", { parents: ["other-folder"] }));
    await expect(new UploadService(gateway, TEST_CONFIG).verify("wrong"))
      .rejects.toMatchObject({ code: "UPLOAD_VERIFY_FAILED" });
  });

  it("updates rows, preserves created_at, changes updated_at, and regenerates numbering", async () => {
    const gateway = new MockGoogleGateway();
    existingTables(gateway);
    gateway.files.set("file-c", driveFile("file-c", { appProperties: { pilokWorkflow: "armada-kapal", staged: "true", displayName: "c.pdf" } }));
    const result = await new SubmissionService(gateway, TEST_CONFIG, () => UPDATED).update({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: true,
      dokumenKapal: [
        { fileId: "file-b", fileName: "b.pdf" },
        { fileId: "file-c", fileName: "c.pdf" },
      ],
    });
    expect(result.createdAt).toBe(CREATED);
    expect(result.updatedAt).toBe(UPDATED);
    expect(gateway.tables.submissions[1]).toEqual([DISTRIBUTOR, "YA", CREATED, UPDATED]);
    expect(gateway.tables.kapal.slice(1, 3).map((row) => [row[1], row[2]])).toEqual([
      ["1", "file-b"],
      ["2", "file-c"],
    ]);
  });

  it("writes Sheets before deleting a replaced file", async () => {
    const gateway = new MockGoogleGateway();
    existingTables(gateway);
    gateway.files.set("file-c", driveFile("file-c"));
    await new SubmissionService(gateway, TEST_CONFIG, () => UPDATED).update({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: true,
      dokumenKapal: [{ fileId: "file-c", fileName: "c.pdf" }],
    });
    expect(gateway.events.indexOf("write")).toBeLessThan(gateway.events.indexOf("delete:file-a"));
    expect(gateway.events.indexOf("write")).toBeLessThan(gateway.events.indexOf("delete:file-b"));
  });

  it("does not delete old files when the Sheets update fails", async () => {
    const gateway = new MockGoogleGateway();
    existingTables(gateway);
    gateway.files.set("file-c", driveFile("file-c"));
    gateway.writeError = new Error("write failed");
    await expect(new SubmissionService(gateway, TEST_CONFIG).update({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: true,
      dokumenKapal: [{ fileId: "file-c", fileName: "c.pdf" }],
    })).rejects.toThrow("write failed");
    expect(gateway.events).not.toContain("delete:file-a");
    expect(gateway.events).not.toContain("delete:file-b");
  });

  it("cleans removed old files only after a successful update", async () => {
    const gateway = new MockGoogleGateway();
    existingTables(gateway);
    await new SubmissionService(gateway, TEST_CONFIG, () => UPDATED).update({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: true,
      dokumenKapal: [{ fileId: "file-b", fileName: "b.pdf" }],
    });
    expect(gateway.events).toContain("delete:file-a");
    expect(gateway.events).not.toContain("delete:file-b");
  });

  it("cleans staged uploads when final submission write fails", async () => {
    const gateway = new MockGoogleGateway();
    gateway.files.set("new-file", driveFile("new-file"));
    gateway.writeError = new Error("write failed");
    await expect(new SubmissionService(gateway, TEST_CONFIG).create({
      namaDistributor: DISTRIBUTOR,
      memilikiArmadaKapal: true,
      dokumenKapal: [{ fileId: "new-file", fileName: "new.pdf" }],
    })).rejects.toThrow("write failed");
    expect(gateway.events).toContain("delete:new-file");
  });
});
