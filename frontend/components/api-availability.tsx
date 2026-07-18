"use client";

import { useEffect, useState } from "react";

import { DashboardView } from "@/components/dashboard-view";
import { NfceCapture } from "@/components/nfce-capture";
import { OnboardingCard } from "@/components/onboarding-card";
import { PrivacyView } from "@/components/privacy-view";
import { ProductsView } from "@/components/products-view";
import { PurchasesView } from "@/components/purchases-view";
import { RegistriesView } from "@/components/registries-view";
import { SettingsView } from "@/components/settings-view";
import { APP_VERSION } from "@/lib/version";
import type { FamilyContext } from "@/types/auth";

type ApiState = "checking" | "online" | "offline";
type AppView =
  | "add"
  | "purchases"
  | "products"
  | "dashboard"
  | "registries"
  | "settings"
  | "privacy"
  | "more";

type Props = {
  apiUrl: string;
  accessToken: string;
  context: FamilyContext;
  onContextRefresh: () => Promise<FamilyContext>;
  onLogout: () => Promise<void>;
  onAccountDeleted: (message: string) => Promise<void>;
};

const HEALTH_TOTAL_WAIT_MS = 75_000;
const HEALTH_ATTEMPT_TIMEOUT_MS = 18_000;
const HEALTH_RETRY_DELAY_MS = 3_500;

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function connectionCopy(elapsedMs: number): {
  title: string;
  detail: string;
} {
  if (elapsedMs < 8_000) {
    return {
      title: "Verificando o servidor",
      detail: "Conectando ao ambiente seguro da sua família…",
    };
  }

  if (elapsedMs < 32_000) {
    return {
      title: "O servidor está iniciando",
      detail: "O Render pode precisar de alguns segundos para despertar.",
    };
  }

  return {
    title: "Ainda preparando o aplicativo",
    detail: "Mantenha esta tela aberta. A conexão será tentada automaticamente.",
  };
}

export function ApiAvailability({
  apiUrl,
  accessToken,
  context,
  onContextRefresh,
  onLogout,
  onAccountDeleted,
}: Props) {
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [attempt, setAttempt] = useState(0);
  const [connectionTitle, setConnectionTitle] = useState(
    "Verificando o servidor",
  );
  const [connectionDetail, setConnectionDetail] = useState(
    "Conectando ao ambiente seguro da sua família…",
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [view, setView] = useState<AppView>("add");
  const [purchaseRefreshKey, setPurchaseRefreshKey] = useState(0);
  const [onboardingOpenKey, setOnboardingOpenKey] = useState(0);
  const [apiVersion, setApiVersion] = useState("");

  useEffect(() => {
    let cancelled = false;
    let activeController: AbortController | null = null;
    let activeTimeout: number | null = null;
    const startedAt = Date.now();

    const checkApi = async () => {
      setApiState("checking");

      while (!cancelled && Date.now() - startedAt < HEALTH_TOTAL_WAIT_MS) {
        if (!navigator.onLine) {
          if (!cancelled) {
            setConnectionTitle("Sem conexão com a internet");
            setConnectionDetail(
              "Reconecte o aparelho. O aplicativo tentará novamente automaticamente.",
            );
            setApiState("offline");
          }
          return;
        }

        const elapsed = Date.now() - startedAt;
        const copy = connectionCopy(elapsed);
        setConnectionTitle(copy.title);
        setConnectionDetail(copy.detail);

        activeController = new AbortController();
        activeTimeout = window.setTimeout(
          () => activeController?.abort(),
          HEALTH_ATTEMPT_TIMEOUT_MS,
        );

        try {
          const response = await fetch(`${normalizeApiUrl(apiUrl)}/health`, {
            cache: "no-store",
            signal: activeController.signal,
          });
          const payload: unknown = await response.json().catch(() => null);
          const isHealthy =
            response.ok &&
            payload !== null &&
            typeof payload === "object" &&
            "status" in payload &&
            payload.status === "ok";

          if (isHealthy) {
            if (!cancelled) {
              if (
                payload &&
                typeof payload === "object" &&
                "version" in payload &&
                typeof payload.version === "string"
              ) {
                setApiVersion(payload.version);
              }
              setApiState("online");
            }
            return;
          }
        } catch {
          // A tentativa seguinte continua acordando o serviço do Render.
        } finally {
          if (activeTimeout !== null) window.clearTimeout(activeTimeout);
          activeTimeout = null;
          activeController = null;
        }

        if (!cancelled) await wait(HEALTH_RETRY_DELAY_MS);
      }

      if (!cancelled) {
        setConnectionTitle("O servidor ainda não respondeu");
        setConnectionDetail(
          "A internet está ativa, mas o backend não ficou disponível dentro do tempo esperado.",
        );
        setApiState("offline");
      }
    };

    void checkApi();

    return () => {
      cancelled = true;
      activeController?.abort();
      if (activeTimeout !== null) window.clearTimeout(activeTimeout);
    };
  }, [apiUrl, attempt]);

  useEffect(() => {
    const handleOnline = () => {
      setApiState("checking");
      setAttempt((value) => value + 1);
    };
    const handleOffline = () => {
      setConnectionTitle("Sem conexão com a internet");
      setConnectionDetail(
        "Reconecte o aparelho. O aplicativo tentará novamente automaticamente.",
      );
      setApiState("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const showPurchases = () => {
    setPurchaseRefreshKey((value) => value + 1);
    setView("purchases");
  };

  const logout = async () => {
    setLoggingOut(true);
    await onLogout();
  };

  const moreActive =
    view === "more" ||
    view === "registries" ||
    view === "settings" ||
    view === "privacy";

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
        <div className="family-session-actions desktop-session-actions">
          <button
            type="button"
            className={view === "registries" ? "active" : ""}
            onClick={() => setView("registries")}
          >
            Cadastros
          </button>
          <button
            type="button"
            className={view === "settings" ? "active" : ""}
            onClick={() => setView("settings")}
          >
            Ajustes
          </button>
          <button type="button" disabled={loggingOut} onClick={() => void logout()}>
            {loggingOut ? "Saindo…" : "Sair"}
          </button>
        </div>
      </section>

      {apiState === "online" && (
        <nav className="app-navigation" aria-label="Navegação principal">
          <button
            type="button"
            className={view === "dashboard" ? "active" : ""}
            aria-current={view === "dashboard" ? "page" : undefined}
            onClick={() => setView("dashboard")}
          >
            <span aria-hidden="true">◫</span>
            Resumo
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
            className={`nav-add ${view === "add" ? "active" : ""}`}
            aria-current={view === "add" ? "page" : undefined}
            onClick={() => setView("add")}
          >
            <span aria-hidden="true">＋</span>
            Adicionar
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
            className={moreActive ? "active" : ""}
            aria-current={moreActive ? "page" : undefined}
            onClick={() => setView("more")}
          >
            <span aria-hidden="true">•••</span>
            Mais
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
                    : view === "registries"
                      ? "Seus cadastros"
                      : view === "settings"
                        ? "Configurações da família"
                        : view === "privacy"
                          ? "Privacidade e dados"
                        : "Mais opções"}
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
                    : view === "registries"
                      ? "Organize categorias e corrija os nomes dos supermercados da sua família."
                      : view === "settings"
                        ? "Atualize seus dados, gerencie membros e compartilhe o acesso da família."
                        : view === "privacy"
                          ? "Entenda quais informações são armazenadas e como controlar sua conta."
                        : "Abra cadastros, ajustes ou encerre sua sessão com segurança."}
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
            <strong>{connectionTitle}</strong>
            <p>{connectionDetail}</p>
          </div>
        </section>
      )}

      {apiState === "online" && (
        <OnboardingCard
          apiUrl={apiUrl}
          accessToken={accessToken}
          forceOpenKey={onboardingOpenKey}
          onAddPurchase={() => setView("add")}
          onOpenProducts={() => setView("products")}
          onOpenSettings={() => setView("settings")}
        />
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

      {apiState === "online" && view === "registries" && (
        <RegistriesView
          apiUrl={apiUrl}
          accessToken={accessToken}
          onClose={() => setView("more")}
        />
      )}

      {apiState === "online" && view === "settings" && (
        <SettingsView
          apiUrl={apiUrl}
          accessToken={accessToken}
          context={context}
          onContextRefresh={onContextRefresh}
          onAccountDeleted={onAccountDeleted}
          onFamilyDeleted={async (message) => {
            await onContextRefresh();
            setView("dashboard");
            window.alert(message);
          }}
          onClose={() => setView("more")}
        />
      )}

      {apiState === "online" && view === "privacy" && (
        <PrivacyView
          apiUrl={apiUrl}
          accessToken={accessToken}
          apiVersion={apiVersion}
          onOpenSettings={() => setView("settings")}
          onClose={() => setView("more")}
        />
      )}

      {apiState === "online" && view === "more" && (
        <section className="more-options-section" aria-label="Mais opções">
          <button type="button" onClick={() => setView("registries")}>
            <span aria-hidden="true">▧</span>
            <div>
              <strong>Cadastros</strong>
              <small>Categorias e supermercados</small>
            </div>
          </button>
          <button type="button" onClick={() => setView("settings")}>
            <span aria-hidden="true">⚙</span>
            <div>
              <strong>Ajustes</strong>
              <small>Família, membros, segurança e backup</small>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setOnboardingOpenKey((value) => value + 1)}
          >
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Guia de início</strong>
              <small>Rever os primeiros passos</small>
            </div>
          </button>
          <button type="button" onClick={() => setView("privacy")}>
            <span aria-hidden="true">◇</span>
            <div>
              <strong>Privacidade</strong>
              <small>Dados, exportação e exclusão</small>
            </div>
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            <span aria-hidden="true">↻</span>
            <div>
              <strong>Verificar atualizações</strong>
              <small>Recarregar a versão instalada</small>
            </div>
          </button>
          <button
            type="button"
            className="more-logout-button"
            disabled={loggingOut}
            onClick={() => void logout()}
          >
            <span aria-hidden="true">⇥</span>
            <div>
              <strong>{loggingOut ? "Saindo…" : "Sair"}</strong>
              <small>Encerrar a sessão neste aparelho</small>
            </div>
          </button>
          <div className="more-version-row">
            <span>Versão do aplicativo</span>
            <strong>
              v{APP_VERSION}
              {apiVersion ? ` · API v${apiVersion}` : ""}
            </strong>
          </div>
        </section>
      )}

      {apiState === "offline" && (
        <section className="feedback-card error-card api-warning" role="alert">
          <strong>{connectionTitle}</strong>
          <p>{connectionDetail}</p>
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
          <strong>v0.9.0 — Preparação para beta</strong>
        </div>
        <div>
          <span>Aplicativo</span>
          <strong>Onboarding, privacidade, versão e exclusão segura</strong>
        </div>
      </section>
    </>
  );
}
