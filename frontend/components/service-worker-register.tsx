"use client";

import { useEffect, useRef, useState } from "react";

type InstallOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
};

const INSTALL_DISMISSED_KEY = "gestao-compras-install-dismissed-v080";

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const refreshRequestedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const canOfferInstall =
      window.location.pathname === "/" && !isStandaloneMode();

    const dismissed =
      window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "true";

    if (canOfferInstall && isIosDevice() && !dismissed) {
      const timer = window.setTimeout(() => setShowIosHint(true), 1_800);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let updateInterval: number | null = null;

    const markUpdate = (worker: ServiceWorker | null) => {
      if (!worker || !navigator.serviceWorker.controller) return;
      waitingWorkerRef.current = worker;
      setUpdateAvailable(true);
    };

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js");

        if (registration.waiting) {
          markUpdate(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration?.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              markUpdate(registration?.waiting ?? installing);
            }
          });
        });

        await registration.update().catch(() => undefined);
        updateInterval = window.setInterval(
          () => void registration?.update().catch(() => undefined),
          30 * 60 * 1_000,
        );
      } catch (error: unknown) {
        console.error("Falha ao registrar o service worker:", error);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void registration?.update().catch(() => undefined);
      }
    };

    const handleControllerChange = () => {
      if (!refreshRequestedRef.current) return;
      window.location.reload();
    };

    void register();
    document.addEventListener("visibilitychange", handleVisibility);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      if (updateInterval !== null) window.clearInterval(updateInterval);
    };
  }, []);

  const dismissInstall = () => {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setShowIosHint(false);
    setInstallPrompt(null);
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const applyUpdate = () => {
    refreshRequestedRef.current = true;
    const waitingWorker = waitingWorkerRef.current;

    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    window.location.reload();
  };

  return (
    <>
      {updateAvailable && (
        <aside className="pwa-notice pwa-update-notice" role="status">
          <div>
            <strong>Nova versão disponível</strong>
            <span>Atualize para usar as melhorias mais recentes.</span>
          </div>
          <button type="button" onClick={applyUpdate}>
            Atualizar agora
          </button>
        </aside>
      )}

      {(installPrompt || showIosHint) && (
        <aside className="pwa-notice pwa-install-notice" role="status">
          <div>
            <strong>Instale o Gestão de Compras</strong>
            <span>
              {showIosHint
                ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
                : "Use como aplicativo, com acesso direto pela tela inicial."}
            </span>
          </div>
          <div className="pwa-notice-actions">
            {installPrompt && (
              <button type="button" onClick={() => void installApp()}>
                Instalar
              </button>
            )}
            <button type="button" className="pwa-dismiss" onClick={dismissInstall}>
              Agora não
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
