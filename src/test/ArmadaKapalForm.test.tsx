import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { ArmadaKapalSubmission } from "../domain/armadaKapal";
import type {
  ArmadaKapalSubmissionRepository,
  DistributorRepository,
  Repositories,
} from "../repositories/contracts";
import {
  MockArmadaKapalSubmissionRepository,
  MockDistributorRepository,
} from "../repositories/mockRepositories";

function makeRepositories(): Repositories {
  return {
    distributors: new MockDistributorRepository(),
    submissions: new MockArmadaKapalSubmissionRepository(),
  };
}

async function setup(repositories = makeRepositories()) {
  const user = userEvent.setup({ applyAccept: false });
  render(<App repositories={repositories} />);
  const combobox = await screen.findByRole("combobox", { name: /nama distributor/i });
  return { user, combobox, repositories };
}

async function selectDistributor(
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
  name = "ABADI PUTERA WIRAJAYA, PT",
) {
  await user.click(combobox);
  await user.type(combobox, name.slice(0, 8));
  await user.click(await screen.findByRole("option", { name }));
  await screen.findByText(name === "ADE LESTARI SEJATI, PT" ? "Data tersimpan ditemukan" : "Data baru");
}

async function completeValidNewForm(
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
) {
  await selectDistributor(user, combobox);
  await user.click(screen.getByRole("checkbox", { name: /ya, distributor/i }));
  await user.upload(
    screen.getByLabelText(/upload dokumen/i),
    new File(["pdf-content"], "kapal-1.pdf", { type: "application/pdf" }),
  );
}

describe("PILOK Armada Kapal", () => {
  it("menampilkan header operasional dengan branding SIG dan PILOK", async () => {
    await setup();
    const header = screen.getByRole("banner");
    expect(within(header).getByAltText("Logo SIG")).toBeVisible();
    expect(within(header).getByAltText("Logo PILOK")).toBeVisible();
    expect(within(header).getByText("Form Operasional")).toBeVisible();
    expect(within(header).getByRole("heading", { name: "PILOK - Armada Kapal" })).toBeVisible();
    expect(within(header).getByText("Pendataan dokumen kepemilikan armada kapal distributor.")).toBeVisible();
  });

  it("mencari master distributor tanpa membedakan kapital", async () => {
    const { user, combobox } = await setup();
    await user.click(combobox);
    await user.type(combobox, "bahari nusantara");
    expect(screen.getByRole("option", { name: "ANUGERAH BAHARI NUSANTARA, PT" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "ABADI PUTERA WIRAJAYA, PT" })).not.toBeInTheDocument();
  });

  it("mempertahankan value lama ketika dropdown ditutup tanpa pilihan baru", async () => {
    const { user, combobox } = await setup();
    await selectDistributor(user, combobox);
    await user.click(combobox);
    await user.type(combobox, "tidak ada");
    await user.keyboard("{Escape}");
    expect(combobox).toHaveValue("ABADI PUTERA WIRAJAYA, PT");
  });

  it("tidak menyediakan opsi Tidak", async () => {
    await setup();
    expect(screen.queryByText(/^Tidak$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /ya, distributor/i })).toBeInTheDocument();
  });

  it("menyembunyikan dokumen sebelum konfirmasi Ya", async () => {
    await setup();
    expect(screen.queryByText(/dokumen bukti kepemilikan kapal/i)).not.toBeInTheDocument();
  });

  it("menampilkan satu slot dokumen setelah konfirmasi Ya", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("checkbox", { name: /ya, distributor/i }));
    expect(screen.getByRole("heading", { name: /dokumen bukti kepemilikan kapal/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Kapal 1" })).toBeVisible();
  });

  it("menolak submit tanpa distributor dan memfokuskan field pertama", async () => {
    const { user, combobox } = await setup();
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    expect(await screen.findByText("Nama Distributor wajib dipilih.")).toBeVisible();
    await waitFor(() => expect(combobox).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("menolak submit jika konfirmasi kepemilikan belum dipilih", async () => {
    const { user, combobox } = await setup();
    await selectDistributor(user, combobox);
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    expect(await screen.findByText("Konfirmasi kepemilikan armada kapal wajib dipilih.")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("menolak submit jika Ya tetapi dokumen masih kosong", async () => {
    const { user, combobox } = await setup();
    await selectDistributor(user, combobox);
    await user.click(screen.getByRole("checkbox", { name: /ya, distributor/i }));
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    expect(await screen.findByText("Dokumen bukti kepemilikan kapal wajib dilampirkan.")).toBeVisible();
  });

  it("menolak tipe file yang tidak diizinkan", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("checkbox", { name: /ya, distributor/i }));
    await user.upload(
      screen.getByLabelText(/upload dokumen/i),
      new File(["text"], "catatan.txt", { type: "text/plain" }),
    );
    expect(await screen.findByText("Format file harus PDF, JPG, JPEG, atau PNG.")).toBeVisible();
  });

  it("menolak file yang lebih besar dari 5 MB", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("checkbox", { name: /ya, distributor/i }));
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "besar.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText(/upload dokumen/i), oversized);
    expect(await screen.findByText("Ukuran file maksimal 5 MB.")).toBeVisible();
  });

  it("menambah dokumen kapal dan memberi nomor berurutan", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("checkbox", { name: /ya, distributor/i }));
    await user.click(screen.getByRole("button", { name: /tambah dokumen kapal/i }));
    expect(screen.getByRole("heading", { name: "Kapal 2" })).toBeVisible();
  });

  it("menghapus dan mengindeks ulang dokumen kapal", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("checkbox", { name: /ya, distributor/i }));
    await user.click(screen.getByRole("button", { name: /tambah dokumen kapal/i }));
    await user.click(screen.getByRole("button", { name: "Hapus Kapal 1" }));
    expect(screen.getByRole("heading", { name: "Kapal 1" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Kapal 2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hapus kapal/i })).not.toBeInTheDocument();
  });

  it("membatasi jumlah dokumen kapal sampai 10", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("checkbox", { name: /ya, distributor/i }));
    const addButton = screen.getByRole("button", { name: /tambah dokumen kapal/i });
    for (let index = 1; index < 10; index += 1) await user.click(addButton);
    expect(screen.getByRole("heading", { name: "Kapal 10" })).toBeVisible();
    expect(addButton).toBeDisabled();
    expect(screen.getByText("Maksimal 10 dokumen kapal telah ditambahkan.")).toBeVisible();
  });

  it("membuka konfirmasi untuk submission valid", async () => {
    const { user, combobox } = await setup();
    await completeValidNewForm(user, combobox);
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    const dialog = await screen.findByRole("dialog", { name: "Konfirmasi Penyimpanan" });
    expect(within(dialog).getByText("ABADI PUTERA WIRAJAYA, PT")).toBeVisible();
    expect(within(dialog).getByText("1 dokumen")).toBeVisible();
  });

  it("membatalkan konfirmasi tanpa menyimpan", async () => {
    const { user, combobox, repositories } = await setup();
    const create = vi.spyOn(repositories.submissions, "create");
    await completeValidNewForm(user, combobox);
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    await user.click(await screen.findByRole("button", { name: "Batal" }));
    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("menyimpan create ke repository dan menampilkan success state", async () => {
    const { user, combobox, repositories } = await setup();
    const create = vi.spyOn(repositories.submissions, "create");
    await completeValidNewForm(user, combobox);
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    await user.click(await screen.findByRole("button", { name: "Ya, Simpan" }));
    expect(await screen.findByRole("heading", { name: "Data berhasil disimpan" })).toBeVisible();
    expect(create).toHaveBeenCalledOnce();
  });

  it("mereset form secara aman dari success state", async () => {
    const { user, combobox } = await setup();
    await completeValidNewForm(user, combobox);
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    await user.click(await screen.findByRole("button", { name: "Ya, Simpan" }));
    await user.click(await screen.findByRole("button", { name: "Kembali ke Form" }));
    expect(await screen.findByRole("combobox", { name: /nama distributor/i })).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: /ya, distributor/i })).not.toBeChecked();
  });

  it("memuat existing submission dan menampilkan action Lihat File yang aman", async () => {
    const { user, combobox } = await setup();
    await selectDistributor(user, combobox, "ADE LESTARI SEJATI, PT");
    expect(screen.getByRole("checkbox", { name: /ya, distributor/i })).toBeChecked();
    expect(screen.getByText("✓ Dokumen sudah tersimpan")).toBeVisible();
    expect(screen.getByText("bukti-kepemilikan-kapal-ade.pdf")).toBeVisible();
    expect(screen.getByRole("link", { name: "Lihat File" })).toHaveAttribute(
      "href",
      "https://drive.google.com/file/d/existing-kapal-1/view",
    );
    expect(screen.getByRole("link", { name: "Lihat File" })).toHaveAttribute("target", "_blank");
  });

  it("mengganti dokumen existing dengan file baru", async () => {
    const { user, combobox } = await setup();
    await selectDistributor(user, combobox, "ADE LESTARI SEJATI, PT");
    await user.upload(
      screen.getByLabelText("Ganti Dokumen"),
      new File(["replacement"], "pengganti.png", { type: "image/png" }),
    );
    expect(screen.getByText("pengganti.png")).toBeVisible();
    expect(screen.getByText("Siap disimpan")).toBeVisible();
  });

  it("membuka Lihat File tanpa mengubah state form", async () => {
    const { user, combobox } = await setup();
    await selectDistributor(user, combobox, "ADE LESTARI SEJATI, PT");
    const viewLink = screen.getByRole("link", { name: "Lihat File" });
    await user.click(viewLink);
    expect(combobox).toHaveValue("ADE LESTARI SEJATI, PT");
    expect(screen.getByRole("checkbox", { name: /ya, distributor/i })).toBeChecked();
    expect(screen.getByText("bukti-kepemilikan-kapal-ade.pdf")).toBeVisible();
  });

  it("menampilkan success state hanya setelah final save selesai", async () => {
    const repositories = makeRepositories();
    let resolveSave: ((value: ArmadaKapalSubmission) => void) | undefined;
    vi.spyOn(repositories.submissions, "create").mockImplementation(
      () => new Promise<ArmadaKapalSubmission>((resolve) => { resolveSave = resolve; }),
    );
    const { user, combobox } = await setup(repositories);
    await completeValidNewForm(user, combobox);
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    await user.click(await screen.findByRole("button", { name: "Ya, Simpan" }));
    expect(screen.queryByRole("heading", { name: "Data berhasil disimpan" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menyimpan..." })).toBeDisabled();
    await act(async () => {
      resolveSave?.({
        namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
        memilikiArmadaKapal: true,
        dokumenKapal: [],
      });
    });
    expect(await screen.findByRole("heading", { name: "Data berhasil disimpan" })).toBeVisible();
  });

  it("menggunakan update dan bukan create pada edit mode", async () => {
    const { user, combobox, repositories } = await setup();
    const update = vi.spyOn(repositories.submissions, "update");
    const create = vi.spyOn(repositories.submissions, "create");
    await selectDistributor(user, combobox, "ADE LESTARI SEJATI, PT");
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    await user.click(await screen.findByRole("button", { name: "Ya, Simpan" }));
    await screen.findByRole("heading", { name: "Data berhasil disimpan" });
    expect(update).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  });

  it("menampilkan loading master dan men-disable submit selama pemuatan", async () => {
    let resolveSearch: ((values: string[]) => void) | undefined;
    const distributors: DistributorRepository = {
      search: vi.fn(() => new Promise<string[]>((resolve) => { resolveSearch = resolve; })),
    };
    const repositories = { distributors, submissions: new MockArmadaKapalSubmissionRepository() };
    render(<App repositories={repositories} />);
    expect(screen.getByRole("status", { name: "Memuat daftar distributor..." })).toBeVisible();
    expect(screen.getByRole("button", { name: "Simpan Data" })).toBeDisabled();
    resolveSearch?.(["ABADI PUTERA WIRAJAYA, PT"]);
    expect(await screen.findByRole("combobox")).toBeVisible();
  });

  it("menampilkan error repository dan menyediakan retry", async () => {
    const distributors: DistributorRepository = {
      search: vi.fn().mockRejectedValue(new Error("offline")),
    };
    const repositories = { distributors, submissions: new MockArmadaKapalSubmissionRepository() };
    render(<App repositories={repositories} />);
    expect(await screen.findByText("Daftar distributor gagal dimuat. Silakan coba kembali.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeVisible();
  });

  it("menampilkan error submit dari repository dan tetap menjaga form", async () => {
    const submissions: ArmadaKapalSubmissionRepository = {
      getByDistributor: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockRejectedValue(new Error("Layanan sementara tidak tersedia.")),
      update: vi.fn(),
    };
    const { user, combobox } = await setup({
      distributors: new MockDistributorRepository(),
      submissions,
    });
    await completeValidNewForm(user, combobox);
    await user.click(screen.getByRole("button", { name: "Simpan Data" }));
    await user.click(await screen.findByRole("button", { name: "Ya, Simpan" }));
    expect(await screen.findByText(/Data gagal disimpan. Layanan sementara tidak tersedia./)).toBeVisible();
    expect(screen.getByRole("form", { name: "Form Armada Kapal" })).toBeVisible();
  });

  it("repository menjaga satu submission aktif per distributor", async () => {
    const repository = new MockArmadaKapalSubmissionRepository([]);
    const submission: ArmadaKapalSubmission = {
      namaDistributor: "ABADI PUTERA WIRAJAYA, PT",
      memilikiArmadaKapal: true,
      dokumenKapal: [{ id: "one", source: "existing", fileName: "one.pdf" }],
    };
    await repository.create(submission);
    await expect(repository.create(submission)).rejects.toThrow("sudah tersimpan");
  });
});
