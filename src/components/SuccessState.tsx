export function SuccessState({ distributor, onReset }: { distributor: string; onReset: () => void }) {
  return (
    <section className="success-state" aria-labelledby="success-title">
      <div className="success-check" aria-hidden="true">✓</div>
      <p className="eyebrow">Penyimpanan Selesai</p>
      <h2 id="success-title">Data berhasil disimpan</h2>
      <p>
        Data kepemilikan armada kapal untuk:
        <strong title={distributor}>{distributor}</strong>
        telah berhasil disimpan.
      </p>
      <button type="button" className="button-primary" onClick={onReset}>
        Kembali ke Form
      </button>
    </section>
  );
}
