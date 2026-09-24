import type { FieldErrors, UseFieldArrayReturn, UseFormTrigger } from "react-hook-form";
import {
  MAX_DOCUMENTS,
  createDocumentId,
  type ArmadaKapalFormValues,
  type KapalDocumentField,
} from "../domain/armadaKapal";
import { FieldError, RequiredMark } from "./FormLayout";

type DocumentListProps = {
  documents: KapalDocumentField[];
  fieldArray: UseFieldArrayReturn<ArmadaKapalFormValues, "dokumenKapal", "fieldKey">;
  errors: FieldErrors<ArmadaKapalFormValues>;
  trigger: UseFormTrigger<ArmadaKapalFormValues>;
  disabled?: boolean;
};

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DocumentList({
  documents,
  fieldArray,
  errors,
  trigger,
  disabled,
}: DocumentListProps) {
  const { fields, append, remove, update } = fieldArray;
  const collectionError = typeof errors.dokumenKapal?.message === "string"
    ? errors.dokumenKapal.message
    : undefined;

  return (
    <div className="document-section" aria-labelledby="documents-label">
      <div className="field-heading">
        <div>
          <h3 id="documents-label">
            Dokumen Bukti Kepemilikan Kapal <RequiredMark />
          </h3>
          <p>Unggah PDF, JPG, JPEG, atau PNG. Maksimal 5 MB per file.</p>
        </div>
        <span className="document-counter">{fields.length}/{MAX_DOCUMENTS}</span>
      </div>

      <div className="document-list">
        {fields.map((field, index) => {
          const document = documents[index] ?? field;
          const inputId = `dokumen-kapal-${index}`;
          const errorId = `${inputId}-error`;
          const fieldError = errors.dokumenKapal?.[index] as
            | { file?: { message?: string }; message?: string }
            | undefined;
          const errorMessage = fieldError?.file?.message ?? fieldError?.message;
          const hasFile = document.source !== "empty";
          const fileName = document.source === "existing"
            ? document.fileName
            : document.source === "new"
              ? document.file.name
              : "";

          return (
            <article className="document-item" key={field.fieldKey}>
              <div className="document-item-header">
                <div className="ship-label">
                  <span className="ship-number" aria-hidden="true">{index + 1}</span>
                  <div>
                    <h4>Kapal {index + 1}</h4>
                    {document.source === "existing" ? (
                      <span className="stored-label">✓ Dokumen sudah tersimpan</span>
                    ) : null}
                  </div>
                </div>
                {fields.length > 1 ? (
                  <button
                    type="button"
                    className="button-text danger-text"
                    aria-label={`Hapus Kapal ${index + 1}`}
                    disabled={disabled}
                    onClick={() => {
                      remove(index);
                      void trigger("dokumenKapal");
                    }}
                  >
                    Hapus
                  </button>
                ) : null}
              </div>

              <input
                id={inputId}
                className="sr-only file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                disabled={disabled}
                aria-invalid={Boolean(errorMessage) || undefined}
                aria-describedby={errorMessage ? errorId : undefined}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  update(index, { id: document.id, source: "new", file });
                  window.setTimeout(() => void trigger("dokumenKapal"), 0);
                  event.target.value = "";
                }}
              />

              {hasFile ? (
                <div className={`file-selected ${errorMessage ? "file-error" : ""}`}>
                  <div className="file-type-icon" aria-hidden="true">{document.source === "new" && document.file.type === "application/pdf" ? "PDF" : "FILE"}</div>
                  <div className="file-details">
                    <p title={fileName}>{fileName}</p>
                    <span>{document.source === "existing" ? "Tersimpan" : "Siap disimpan"}</span>
                  </div>
                  {document.source === "existing" && document.fileUrl ? (
                    <a
                      className="button-text view-file"
                      href={document.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Lihat File
                    </a>
                  ) : null}
                  <label className="button-text replace-file" htmlFor={inputId}>Ganti Dokumen</label>
                </div>
              ) : (
                <label className={`upload-box ${errorMessage ? "upload-error" : ""}`} htmlFor={inputId}>
                  <UploadIcon />
                  <span>Upload Dokumen</span>
                  <small>Pilih file dari perangkat</small>
                </label>
              )}
              <FieldError id={errorId}>{errorMessage}</FieldError>
            </article>
          );
        })}
      </div>

      <FieldError id="dokumen-kapal-error">{collectionError}</FieldError>
      <button
        type="button"
        className="button-secondary add-document"
        disabled={disabled || fields.length >= MAX_DOCUMENTS}
        onClick={() => append({ id: createDocumentId(), source: "empty" })}
      >
        <span aria-hidden="true">+</span>
        Tambah Dokumen Kapal
      </button>
      {fields.length >= MAX_DOCUMENTS ? (
        <p className="limit-note" role="status">Maksimal 10 dokumen kapal telah ditambahkan.</p>
      ) : null}
    </div>
  );
}
