import { useEffect, useRef } from "react";

type ConfirmationDialogProps = {
  open: boolean;
  distributor: string;
  documentCount: number;
  submitting: boolean;
  progressLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationDialog({
  open,
  distributor,
  documentCount,
  submitting,
  progressLabel,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onCancel, submitting]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={() => !submitting && onCancel()}>
      <div
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-icon" aria-hidden="true">?</div>
        <h2 id="confirmation-title">Konfirmasi Penyimpanan</h2>
        <p id="confirmation-description">Pastikan data yang Anda masukkan sudah benar.</p>
        <dl className="confirmation-summary">
          <div>
            <dt>Distributor</dt>
            <dd title={distributor}>{distributor}</dd>
          </div>
          <div>
            <dt>Jumlah Dokumen Kapal</dt>
            <dd>{documentCount} dokumen</dd>
          </div>
        </dl>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="button-secondary" disabled={submitting} onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="button-primary" disabled={submitting} onClick={onConfirm}>
            {submitting ? <span className="button-spinner" aria-hidden="true" /> : null}
            {submitting ? progressLabel ?? "Menyimpan..." : "Ya, Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
