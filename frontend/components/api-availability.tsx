"use client";

import { useEffect, useState } from "react";

import { NfceCapture } from "@/components/nfce-capture";
import type { FamilyContext } from "@/types/auth";

type ApiState = "checking" | "online" | "offline";

type Props = {
  apiUrl: string;
  accessToken: string;
  context: FamilyContext;
  onLogout: () => Promise<void>;
};

const HEALTH_TIMEOUT_MS = 75_000;

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

export function ApiAvailability({
  apiUrl,
  accessToken,
  context,
  onLogout,
}: Props) {
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      HEALTH_TIMEOUT_MS,
    );

    fetch(`${normalizeApiUrl(apiUrl)}/health`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          setApiState("offline");
          return;
        }

        const payload: unknown = await response.json().catch(() => null);
        const isHealthy =
          payload !== null &&
          typeof payload === "object" &&
          "status" in payload &&
          payload.status === "ok";

        setApiState(isHealthy ? "online" : "offline");
      })
      .catch(() => setApiState("offline"))
      .finally(() => window.clearTimeout(timeout));

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [apiUrl, attempt]);

  return (
    <>
      <section className="family-session-card">
        <div className="family-session-copy">
          <span>Sua família</span>
          <strong>{context.familia_nome}</strong>
          <small>
            {context.nome} · {context.papel === "administrador" ? "Administrador" : "Membro"}
          </small>
        </div>
        <button
          type="button"
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            await onLogout();
          }}
        >
          {loggingOut ? "Saindo…" : "Sair"}
        </button>
      </section>

      <section className="hero-card compact-hero">
        <div>
          <p className="eyebrow">Gestão de Compras Web</p>
          <h1>Registre uma compra</h1>
          <p className="subtitle">
            Capture o QR Code, confira os itens e salve a compra no espaço seguro da sua família.
          </p>
        </div>

        <div className={`status status-${apiState}`} aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {apiState === "checking" && "Conectando à API"}
          {apiState === "online" && "API conectada"}
          {apiState === "offline" && "API indisponível"}
        </div>
      </section>

      {apiState === "checking" && (
        <section className="processing-card api-connection-card" role="status">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>Preparando a leitura</strong>
            <p>O servidor online pode levar alguns segundos para responder.</p>
          </div>
        </section>
      )}

      {apiState === "online" && (
        <NfceCapture apiUrl={apiUrl} accessToken={accessToken} />
      )}

      {apiState === "offline" && (
        <section className="feedback-card error-card api-warning" role="alert">
          <strong>Não consegui acessar o backend</strong>
          <p>
            Confirme o endereço da API ou aguarde o serviço iniciar. Depois,
            tente novamente.
          </p>
          <button
            className="capture-button retry-api-button"
            type="button"
            onClick={() => {
              setApiState("checking");
              setAttempt((value) => value + 1);
            }}
          >
            Tentar conectar novamente
          </button>
        </section>
      )}

      <section className="checkpoint-card">
        <div>
          <span>Checkpoint</span>
          <strong>v0.3.1 — Primeira gravação de compras</strong>
        </div>
        <div>
          <span>Banco online</span>
          <strong>Supabase com isolamento por familia_id</strong>
        </div>
      </section>
    </>
  );
}
