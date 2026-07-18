import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Termos do beta | Gestão de Compras",
};

export default function TermsPage() {
  return (
    <main className="page-shell legal-page-shell">
      <LegalDocument type="terms" />
    </main>
  );
}
