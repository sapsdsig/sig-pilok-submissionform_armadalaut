import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import type {
  ArmadaKapalFormValues,
  ArmadaKapalSubmission,
  KapalDocument,
} from "./domain/armadaKapal";
import { createEmptyDocument } from "./domain/armadaKapal";
import { armadaKapalFormSchema } from "./domain/validation";
import type { Repositories } from "./repositories/contracts";
import type { SaveStage } from "./repositories/contracts";
import { SearchableSelect } from "./components/SearchableSelect";
import { DocumentList } from "./components/DocumentList";
import { ConfirmationDialog } from "./components/ConfirmationDialog";
import { SuccessState } from "./components/SuccessState";
import {
  ActionBar,
  FieldError,
  LoadingSkeleton,
  RequiredMark,
  SectionCard,
  SectionHeader,
  StatusBanner,
} from "./components/FormLayout";

const EMPTY_VALUES: ArmadaKapalFormValues = {
  namaDistributor: "",
  memilikiArmadaKapal: null,
  dokumenKapal: [],
};

type Mode = "create" | "edit";

export function ArmadaKapalForm({ repositories }: { repositories: Repositories }) {
  const [distributors, setDistributors] = useState<string[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [repositoryError, setRepositoryError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("create");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<ArmadaKapalFormValues | null>(null);
  const [savedDistributor, setSavedDistributor] = useState<string | null>(null);
  const [saveStage, setSaveStage] = useState<SaveStage | null>(null);
  const requestSequence = useRef(0);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    trigger,
    watch,
  } = useForm<ArmadaKapalFormValues>({
    resolver: zodResolver(armadaKapalFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: EMPTY_VALUES,
    shouldFocusError: false,
  });

  const fieldArray = useFieldArray({
    control,
    name: "dokumenKapal",
    keyName: "fieldKey",
  });
  const documents = watch("dokumenKapal");
  const ownsShip = watch("memilikiArmadaKapal");

  const loadDistributors = useCallback(async () => {
    setLoadingMaster(true);
    setRepositoryError(null);
    try {
      setDistributors(await repositories.distributors.search());
    } catch {
      setRepositoryError("Daftar distributor gagal dimuat. Silakan coba kembali.");
    } finally {
      setLoadingMaster(false);
    }
  }, [repositories.distributors]);

  useEffect(() => {
    void loadDistributors();
  }, [loadDistributors]);

  const chooseDistributor = async (namaDistributor: string) => {
    const requestId = ++requestSequence.current;
    setRepositoryError(null);
    setSubmitError(null);
    setLoadingSubmission(true);
    setMode("create");
    reset({ ...EMPTY_VALUES, namaDistributor });

    try {
      const existing = await repositories.submissions.getByDistributor(namaDistributor);
      if (requestSequence.current !== requestId) return;
      if (existing) {
        setMode("edit");
        reset({
          namaDistributor: existing.namaDistributor,
          memilikiArmadaKapal: existing.memilikiArmadaKapal,
          dokumenKapal: existing.dokumenKapal.map((document) => ({ ...document })),
        });
      }
    } catch {
      if (requestSequence.current === requestId) {
        setRepositoryError("Data distributor gagal diperiksa. Silakan pilih ulang atau coba kembali.");
      }
    } finally {
      if (requestSequence.current === requestId) setLoadingSubmission(false);
    }
  };

  const focusFirstInvalid = () => {
    window.setTimeout(() => {
      const invalid = document.querySelector<HTMLElement>("[aria-invalid='true']");
      invalid?.scrollIntoView({ behavior: "smooth", block: "center" });
      invalid?.focus();
    }, 0);
  };

  const openConfirmation = (values: ArmadaKapalFormValues) => {
    setSubmitError(null);
    setPendingValues(values);
    setConfirmationOpen(true);
  };

  const save = async () => {
    if (!pendingValues || pendingValues.memilikiArmadaKapal === null) return;
    setSubmitError(null);

    const submission: ArmadaKapalSubmission = {
      namaDistributor: pendingValues.namaDistributor,
      memilikiArmadaKapal: pendingValues.memilikiArmadaKapal,
      dokumenKapal: pendingValues.memilikiArmadaKapal
        ? pendingValues.dokumenKapal.filter(
            (document): document is KapalDocument => document.source !== "empty",
          )
        : [],
    };

    try {
      const options = { onStageChange: setSaveStage };
      if (mode === "edit") await repositories.submissions.update(submission, options);
      else await repositories.submissions.create(submission, options);
      setConfirmationOpen(false);
      setSavedDistributor(submission.namaDistributor);
    } catch (error) {
      setConfirmationOpen(false);
      setSubmitError(
        error instanceof Error && error.message
          ? `Data gagal disimpan. ${error.message}`
          : "Data gagal disimpan. Silakan coba kembali.",
      );
    } finally {
      setSaveStage(null);
    }
  };

  const returnToForm = () => {
    requestSequence.current += 1;
    setSavedDistributor(null);
    setPendingValues(null);
    setMode("create");
    setSubmitError(null);
    setRepositoryError(null);
    reset(EMPTY_VALUES);
  };

  const documentCount = useMemo(
    () => pendingValues?.memilikiArmadaKapal
      ? pendingValues.dokumenKapal.filter((document) => document.source !== "empty").length
      : 0,
    [pendingValues],
  );

  if (savedDistributor) {
    return <SuccessState distributor={savedDistributor} onReset={returnToForm} />;
  }

  return (
    <>
      <form
        noValidate
        onSubmit={handleSubmit(openConfirmation, focusFirstInvalid)}
        aria-label="Form Armada Kapal"
      >
        {repositoryError ? (
          <StatusBanner variant="error" title="Terjadi kendala">
            <p>{repositoryError}</p>
            {loadingMaster ? null : (
              <button type="button" className="button-text banner-action" onClick={() => void loadDistributors()}>
                Coba lagi
              </button>
            )}
          </StatusBanner>
        ) : null}
        {submitError ? (
          <StatusBanner variant="error" title="Penyimpanan belum berhasil">
            {submitError}
          </StatusBanner>
        ) : null}

        <SectionCard>
          <SectionHeader
            number={1}
            title="Informasi Distributor"
            description="Cari dan pilih distributor yang tersedia pada master."
          />
          {loadingMaster ? (
            <LoadingSkeleton label="Memuat daftar distributor..." />
          ) : (
            <Controller
              control={control}
              name="namaDistributor"
              render={({ field, fieldState }) => (
                <div className="field-group">
                  <label htmlFor="nama-distributor">
                    Nama Distributor <RequiredMark />
                  </label>
                  <SearchableSelect
                    ref={field.ref}
                    id="nama-distributor"
                    options={distributors}
                    value={field.value}
                    disabled={loadingSubmission || isSubmitting}
                    invalid={Boolean(fieldState.error)}
                    describedBy={fieldState.error ? "nama-distributor-error" : undefined}
                    onChange={(value) => {
                      field.onChange(value);
                      void chooseDistributor(value);
                    }}
                  />
                  <FieldError id="nama-distributor-error">{fieldState.error?.message}</FieldError>
                </div>
              )}
            />
          )}
          {loadingSubmission ? <LoadingSkeleton label="Memeriksa data distributor..." /> : null}
          {!loadingSubmission && watch("namaDistributor") ? (
            <StatusBanner
              variant={mode === "edit" ? "info" : "success"}
              title={mode === "edit" ? "Data tersimpan ditemukan" : "Data baru"}
            >
              {mode === "edit"
                ? "Anda sedang memperbarui data armada kapal distributor ini."
                : "Belum ada data aktif. Anda akan membuat data baru."}
            </StatusBanner>
          ) : null}
        </SectionCard>

        <SectionCard>
          <SectionHeader
            number={2}
            title="Kepemilikan Armada Kapal"
            description="Pilih status kepemilikan armada kapal distributor."
          />
          <Controller
            control={control}
            name="memilikiArmadaKapal"
            render={({ field, fieldState }) => (
              <fieldset className="field-group ownership-field" disabled={loadingSubmission || isSubmitting}>
                <legend>
                  Apakah memiliki armada kapal? <RequiredMark />
                </legend>
                <div className="ownership-options">
                  {([
                    [true, "Ya"],
                    [false, "Tidak"],
                  ] as const).map(([value, label], index) => (
                    <label
                      key={label}
                      className={`ownership-option ${fieldState.error ? "ownership-error" : ""}`}
                    >
                      <input
                        type="radio"
                        ref={index === 0 ? field.ref : undefined}
                        name={field.name}
                        value={String(value)}
                        checked={field.value === value}
                        aria-invalid={Boolean(fieldState.error) || undefined}
                        aria-describedby={fieldState.error ? "kepemilikan-error" : undefined}
                        onBlur={field.onBlur}
                        onChange={() => {
                          field.onChange(value);
                          if (value && fieldArray.fields.length === 0) {
                            fieldArray.append(createEmptyDocument());
                          } else if (!value) {
                            fieldArray.replace([]);
                          }
                          window.setTimeout(
                            () => void trigger(["memilikiArmadaKapal", "dokumenKapal"]),
                            0,
                          );
                        }}
                      />
                      <span className="custom-radio" aria-hidden="true" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <FieldError id="kepemilikan-error">{fieldState.error?.message}</FieldError>
              </fieldset>
            )}
          />

          {ownsShip ? (
            <DocumentList
              documents={documents}
              fieldArray={fieldArray}
              errors={errors}
              trigger={trigger}
              disabled={loadingSubmission || isSubmitting}
            />
          ) : null}
        </SectionCard>

        <ActionBar>
          <button
            type="submit"
            className="button-primary save-button"
            disabled={loadingMaster || loadingSubmission || isSubmitting}
          >
            Simpan Data
          </button>
        </ActionBar>
      </form>

      <ConfirmationDialog
        open={confirmationOpen}
        distributor={pendingValues?.namaDistributor ?? ""}
        ownsShip={pendingValues?.memilikiArmadaKapal === true}
        documentCount={documentCount}
        submitting={isSubmitting}
        progressLabel={saveStage === "uploading" ? "Mengunggah..." : "Menyimpan..."}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => void handleSubmit(save, focusFirstInvalid)()}
      />
    </>
  );
}
