import { useMemo } from "react";
import { ArmadaKapalForm } from "./ArmadaKapalForm";
import { BrandHeader, FormShell } from "./components/FormLayout";
import { createHttpRepositories } from "./repositories/http/httpRepositories";
import type { Repositories } from "./repositories/contracts";

export function App({ repositories }: { repositories?: Repositories }) {
  const defaultRepositories = useMemo(() => createHttpRepositories(), []);

  return (
    <FormShell>
      <BrandHeader />
      <main className="form-container">
        <ArmadaKapalForm repositories={repositories ?? defaultRepositories} />
      </main>
      <footer className="site-footer">PILOK · Sistem Informasi Distributor SIG</footer>
    </FormShell>
  );
}
