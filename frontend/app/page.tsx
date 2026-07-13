const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getApiStatus(): Promise<"online" | "offline"> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      cache: "no-store",
    });

    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export default async function Home() {
  const status = await getApiStatus();

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Gestão de Compras Web</p>
          <h1>Fundação mobile pronta para evoluir</h1>
          <p className="subtitle">
            Nova aplicação em Next.js e FastAPI, construída em paralelo ao
            sistema Streamlit atual.
          </p>
        </div>

        <div className={`status status-${status}`}>
          <span className="status-dot" aria-hidden="true" />
          API {status === "online" ? "conectada" : "indisponível"}
        </div>
      </section>

      <section className="actions-grid" aria-label="Ações principais">
        <button className="primary-action" type="button" disabled>
          Ler QR-CODE da NF
          <small>Disponível na fase NFC-e</small>
        </button>

        <article className="info-card">
          <strong>Checkpoint atual</strong>
          <span>v0.1.0 — Estrutura inicial</span>
        </article>

        <article className="info-card">
          <strong>Aplicação atual preservada</strong>
          <span>Streamlit v0.5.14</span>
        </article>

        <article className="info-card">
          <strong>Próximo marco</strong>
          <span>Captura e conferência da NFC-e no iPhone</span>
        </article>
      </section>
    </main>
  );
}
