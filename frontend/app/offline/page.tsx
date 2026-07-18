import { OfflineRetry } from "@/components/offline-retry";

export default function OfflinePage() {
  return (
    <main className="page-shell offline-page-shell">
      <section className="hero-card offline-hero-card">
        <div>
          <p className="eyebrow">Gestão de Compras</p>
          <h1>Sem conexão no momento</h1>
          <p className="subtitle">
            O aplicativo precisa de internet para consultar NFC-e e carregar os
            dados seguros da sua família.
          </p>
        </div>
        <OfflineRetry />
      </section>
    </main>
  );
}
