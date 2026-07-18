import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Aviso de Privacidade | Gestão de Compras",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="page-shell legal-page-shell">
      <LegalDocument type="privacy" />
    </main>
  );
}
