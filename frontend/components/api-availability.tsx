"use client";

import { useEffect, useState } from "react";

import { DashboardView } from "@/components/dashboard-view";
import { NfceCapture } from "@/components/nfce-capture";
import { PurchasesView } from "@/components/purchases-view";
import { SettingsView } from "@/components/settings-view";
import { ProductsView } from "@/components/products-view";
import type { FamilyContext } from "@/types/auth";

type ApiState = "checking" | "online" | "offline";
type AppView = "add" | "purchases" | "products" | "dashboard" | "settings";

type Props = {
  apiUrl: string;
  accessToken: string;
  context: FamilyContext;
  onContextRefresh: () => Promise<FamilyContext>;
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
  onContextRefresh,
  onLogout,
}: Props) {
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [view, setView] = useState<AppView>("add");
  const [purchaseRefreshKey, setPurchaseRefreshKey] = useState(0);

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

  const showPurchases = () => {
    setPurchaseRefreshKey((value) => value + 1);
    setView("purchases");
  };

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
        <div className="family-session-actions">
          <button
            type="button"
            className={view === "settings" ? "active" : ""}
            onClick={() => setView("settings")}
          >
            Ajustes
          </button>
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
        </div>
      </section>

      {apiState === "online" && (
        <nav className="app-navigation" aria-label="Navegação principal">
          <button
            type="button"
            className={view === "add" ? "active" : ""}
            aria-current={view === "add" ? "page" : undefined}
            onClick={() => setView("add")}
          >
            <span aria-hidden="true">＋</span>
            Adicionar
          </button>
          <button
            type="button"
            className={view === "purchases" ? "active" : ""}
            aria-current={view === "purchases" ? "page" : undefined}
            onClick={showPurchases}
          >
            <span aria-hidden="true">▤</span>
            Compras
          </button>
          <button
            type="button"
            className={view === "products" ? "active" : ""}
            aria-current={view === "products" ? "page" : undefined}
            onClick={() => setView("products")}
          >
            <span aria-hidden="true">▦</span>
            Produtos
          </button>
          <button
            type="button"
            className={view === "dashboard" ? "active" : ""}
            aria-current={view === "dashboard" ? "page" : undefined}
            onClick={() => setView("dashboard")}
          >
            <span aria-hidden="true">◫</span>
            Resumo
          </button>
        </nav>
      )}

      <section className="hero-card compact-hero">
        <div>
          <p className="eyebrow">Gestão de Compras Web</p>
          <h1>
            {view === "add"
              ? "Registre uma compra"
              : view === "purchases"
                ? "Suas compras"
                : view === "products"
                  ? "Seus produtos"
                  : view === "dashboard"
                    ? "Resumo da família"
                    : "Configurações da família"}
          </h1>
          <p className="subtitle">
            {view === "add"
              ? "Capture o QR Code, confira os itens e salve a compra no espaço seguro da sua família."
              : view === "purchases"
                ? "Consulte o histórico e abra os itens de cada compra sem sair da página."
                : view === "products"
                  ? "Revise nomes, marcas e categorias sem perder o histórico já registrado."
                  : view === "dashboard"
                    ? "Acompanhe gastos mensais, rankings e a evolução dos preços dos produtos."
                    : "Atualize seus dados, gerencie membros e compartilhe o acesso da família."}
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
            <strong>Preparando o aplicativo</strong>
            <p>O servidor online pode levar alguns segundos para responder.</p>
          </div>
        </section>
      )}

      {apiState === "online" && view === "add" && (
        <NfceCapture
          apiUrl={apiUrl}
          accessToken={accessToken}
          onPurchaseSaved={() => {
            setPurchaseRefreshKey((value) => value + 1);
          }}
          onOpenPurchases={showPurchases}
        />
      )}

      {apiState === "online" && view === "purchases" && (
        <PurchasesView
          key={`purchases-${purchaseRefreshKey}`}
          apiUrl={apiUrl}
          accessToken={accessToken}
          refreshKey={purchaseRefreshKey}
          canDeletePurchases={context.papel === "administrador"}
          onAddPurchase={() => setView("add")}
        />
      )}


      {apiState === "online" && view === "products" && (
        <ProductsView
          apiUrl={apiUrl}
          accessToken={accessToken}
          onAddPurchase={() => setView("add")}
        />
      )}

      {apiState === "online" && view === "dashboard" && (
        <DashboardView
          apiUrl={apiUrl}
          accessToken={accessToken}
          onAddPurchase={() => setView("add")}
        />
      )}

      {apiState === "online" && view === "settings" && (
        <SettingsView
          apiUrl={apiUrl}
          accessToken={accessToken}
          context={context}
          onContextRefresh={onContextRefresh}
          onClose={() => setView("dashboard")}
        />
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
          <strong>v0.6.2 — Senhas e segurança</strong>
        </div>
        <div>
          <span>Dados</span>
          <strong>Alteração de senha, recuperação segura e convite por WhatsApp</strong>
        </div>
      </section>
    </>
  );
}
