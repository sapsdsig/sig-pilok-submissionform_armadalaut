import type { ReactNode } from "react";

type ChildrenProps = { children: ReactNode };

export function FormShell({ children }: ChildrenProps) {
  return <div className="form-shell">{children}</div>;
}

export function BrandHeader() {
  return (
    <header className="brand-header">
      <div className="brand-header-inner">
        <div className="brand-logo-group" aria-label="SIG dan PILOK">
          <div className="brand-sig-logo-frame">
            <img src="/branding/sig-logo-red.svg" alt="Logo SIG" className="brand-sig-logo-image" />
          </div>
          <span className="brand-logo-divider" aria-hidden="true" />
          <img src="/branding/pilok-logo-red.svg" alt="Logo PILOK" className="brand-pilok-logo-image" />
        </div>
        <div className="brand-title-block">
          <p className="brand-eyebrow">Form Operasional</p>
          <h1>PILOK - Armada Kapal</h1>
          <p className="brand-subtitle">Pendataan dokumen kepemilikan armada kapal distributor.</p>
        </div>
      </div>
    </header>
  );
}

export function SectionCard({ children }: ChildrenProps) {
  return <section className="section-card">{children}</section>;
}

export function SectionHeader({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-header">
      <span className="step-badge" aria-hidden="true">
        {number}
      </span>
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {children}
    </p>
  );
}

export function RequiredMark() {
  return (
    <span className="required-mark" aria-hidden="true">
      *
    </span>
  );
}

export function ActionBar({ children }: ChildrenProps) {
  return <div className="action-bar">{children}</div>;
}

export function StatusBanner({
  variant,
  title,
  children,
}: {
  variant: "info" | "success" | "warning" | "error";
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`status-banner status-${variant}`} role={variant === "error" ? "alert" : "status"}>
      <span className="status-indicator" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="status-title">{title}</p>
        {children ? <div className="status-copy">{children}</div> : null}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="loading-block" role="status" aria-label={label}>
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
