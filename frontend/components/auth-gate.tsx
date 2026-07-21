"use client";

import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useRef, useState } from "react";

import { ApiAvailability } from "@/components/api-availability";
import { LegalAcceptance } from "@/components/legal-acceptance";
import { LegalDocumentModal } from "@/components/legal-document";
import { ApiRequestError, SESSION_EXPIRED_EVENT } from "@/lib/api-client";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import {
  APP_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/version";
import {
  fetchFamilyContext,
  fetchFamilyContextDirect,
} from "@/services/auth-context";
import {
  acceptLegalDocumentsDirect,
  fetchLegalAcceptanceDirect,
  reportTechnicalEvent,
} from "@/services/beta";
import type { FamilyContext } from "@/types/auth";
import type { AceiteLegalStatus } from "@/types/beta";

type Props = {
  apiUrl: string;
  initialView?: "admin";
};

type AuthMode = "login" | "signup";
type LegalModalType = "terms" | "privacy" | null;

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "A confirmação de e-mail ainda está ativa no Supabase. Desative Confirm email para liberar o acesso imediato.";
  }
  if (normalized.includes("user already registered")) {
    return "Este e-mail já possui uma conta.";
  }
  if (normalized.includes("password")) {
    return "A senha não atende aos requisitos de segurança.";
  }

  return message;
}

function acceptedStatus(result: {
  termos_versao: string;
  privacidade_versao: string;
  aceito_em: string;
}): AceiteLegalStatus {
  return {
    aceito: true,
    termos_versao_atual: TERMS_VERSION,
    privacidade_versao_atual: PRIVACY_VERSION,
    termos_versao_aceita: result.termos_versao,
    privacidade_versao_aceita: result.privacidade_versao,
    aceito_em: result.aceito_em,
  };
}

export function AuthGate({ apiUrl, initialView }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [context, setContext] = useState<FamilyContext | null>(null);
  const [legalStatus, setLegalStatus] = useState<AceiteLegalStatus | null>(null);
  const [legalError, setLegalError] = useState("");
  const [legalAttempt, setLegalAttempt] = useState(0);
  const [contextAttempt, setContextAttempt] = useState(0);
  const [contextError, setContextError] = useState("");
  const [contextSupportCode, setContextSupportCode] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [familyName, setFamilyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupLegalAccepted, setSignupLegalAccepted] = useState(false);
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sessionExpiredRef = useRef(false);
  const legalAcceptedLocallyRef = useRef(false);

  // Acorda o Render enquanto a pessoa ainda está na tela de login. Essa
  // tentativa não bloqueia o formulário nem o carregamento pelo Supabase.
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60_000);
    void fetch(`${normalizeApiUrl(apiUrl)}/health`, {
      cache: "no-store",
      signal: controller.signal,
    }).catch(() => undefined);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [apiUrl]);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        sessionExpiredRef.current = false;
      }

      setSession(nextSession);
      if (!nextSession) legalAcceptedLocallyRef.current = false;
      setContext(null);
      setContextError("");
      setContextSupportCode("");
      setLegalStatus(null);
      setLegalError("");
      setSessionLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (sessionExpiredRef.current) return;
      sessionExpiredRef.current = true;
      setMessage("Sua sessão expirou. Entre novamente para continuar.");
      setContext(null);
      setContextError("");
      void supabase?.auth.signOut({ scope: "local" });
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  // O contexto e o aceite são consultados diretamente no Supabase e em
  // paralelo. Assim a entrada da família não depende do cold start do Render.
  useEffect(() => {
    if (!session) return;

    const controller = new AbortController();
    let cancelled = false;

    const prepareAccess = async () => {
      const [legalResult, contextResult] = await Promise.allSettled([
        fetchLegalAcceptanceDirect(session.access_token, controller.signal),
        fetchFamilyContextDirect(session.access_token, controller.signal),
      ]);

      if (cancelled) return;

      if (legalResult.status === "fulfilled") {
        if (!(legalAcceptedLocallyRef.current && !legalResult.value.aceito)) {
          setLegalStatus(legalResult.value);
          if (legalResult.value.aceito) legalAcceptedLocallyRef.current = false;
        }
      } else if (
        !(legalResult.reason instanceof DOMException) ||
        legalResult.reason.name !== "AbortError"
      ) {
        setLegalError(
          legalResult.reason instanceof Error
            ? legalResult.reason.message
            : "Não foi possível verificar os documentos do beta.",
        );
      }

      if (contextResult.status === "fulfilled") {
        setContext(contextResult.value);
      } else if (
        !(contextResult.reason instanceof DOMException) ||
        contextResult.reason.name !== "AbortError"
      ) {
        const error = contextResult.reason;
        const supportCode = error instanceof ApiRequestError ? error.requestId : "";
        setContextError(
          error instanceof Error
            ? error.message
            : "Não foi possível preparar o acesso da família.",
        );
        setContextSupportCode(supportCode);

        void reportTechnicalEvent(apiUrl, session.access_token, {
          evento: "contexto_familia_falhou",
          pagina: "/",
          app_version: APP_VERSION,
          codigo: error instanceof ApiRequestError ? error.code : "CONTEXT_DIRECT",
          ...(supportCode ? { request_id: supportCode } : {}),
        }).catch(() => undefined);
      }
    };

    void prepareAccess();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiUrl, contextAttempt, legalAttempt, session]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setMessage("");

    if (mode === "signup" && password !== confirmPassword) {
      setMessage("As senhas informadas não são iguais.");
      setSubmitting(false);
      return;
    }

    if (mode === "signup" && !signupLegalAccepted) {
      setMessage(
        "Leia e confirme os Termos e o Aviso de Privacidade para criar a conta.",
      );
      setSubmitting(false);
      return;
    }

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                nome: adminName.trim(),
                familia_nome: familyName.trim(),
              },
              emailRedirectTo: window.location.origin,
            },
          });

    if (result.error) {
      setMessage(friendlyAuthError(result.error.message));
      setSubmitting(false);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage(
        "A família foi criada, mas o Supabase ainda exige confirmação por e-mail. Desative Confirm email nas configurações de autenticação.",
      );
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setSubmitting(false);
      return;
    }

    if (mode === "signup" && result.data.session) {
      try {
        const registered = await acceptLegalDocumentsDirect(
          result.data.session.access_token,
          TERMS_VERSION,
          PRIVACY_VERSION,
        );
        legalAcceptedLocallyRef.current = true;
        setLegalStatus(acceptedStatus(registered));
      } catch (error: unknown) {
        // A conta continua válida. Em caso de falha transitória, o aceite pode
        // ser concluído pela tela de recuperação já existente.
        setMessage(
          error instanceof Error
            ? `A conta foi criada, mas o aceite não foi concluído: ${error.message}`
            : "A conta foi criada, mas não foi possível registrar o aceite.",
        );
      }
    } else {
      sessionExpiredRef.current = false;
      setMessage("");
    }

    setSubmitting(false);
  };

  const legalModalElement = legalModal ? (
    <LegalDocumentModal type={legalModal} onClose={() => setLegalModal(null)} />
  ) : null;

  if (!supabaseConfigured) {
    return (
      <section className="feedback-card error-card" role="alert">
        <strong>Supabase ainda não configurado</strong>
        <p>
          Cadastre NEXT_PUBLIC_SUPABASE_URL e
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no frontend.
        </p>
      </section>
    );
  }

  if (sessionLoading) {
    return (
      <section className="processing-card" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Verificando acesso</strong>
          <p>Carregando sua sessão segura…</p>
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <>
        <section className="auth-shell">
          <section className="auth-brand-card" aria-label="Gestão de Compras">
            <div className="auth-brand-row">
              <Image
                className="auth-brand-logo"
                src="/icons/app_icon.png"
                alt="Logo do Gestão de Compras"
                width={92}
                height={92}
                priority
              />
              <div className="auth-brand-name">
                <span>GESTÃO DE</span>
                <strong>COMPRAS</strong>
              </div>
            </div>
            <p>ACESSE A SUA CONTA</p>
          </section>

          <form className="auth-card" onSubmit={submit}>
            <div className="auth-mode-copy">
              <strong>
                {mode === "login"
                  ? "Bem-vindo de volta"
                  : "Crie o espaço da sua família"}
              </strong>
              <span>
                {mode === "login"
                  ? "Entre para consultar e registrar as compras da sua família."
                  : "Cada família possui seus próprios membros e dados, separados das demais contas."}
              </span>
            </div>
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setMessage("");
                  setSignupLegalAccepted(false);
                }}
              >
                Entrar
              </button>
              <button
                type="button"
                className={mode === "signup" ? "active" : ""}
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
              >
                Criar minha família
              </button>
            </div>

            {mode === "signup" && (
              <>
                <label>
                  Nome da família
                  <input
                    type="text"
                    value={familyName}
                    onChange={(event) => setFamilyName(event.target.value)}
                    autoComplete="organization"
                    minLength={2}
                    maxLength={80}
                    placeholder="Ex.: Família Nardi"
                    required
                  />
                </label>

                <label>
                  Nome do administrador
                  <input
                    type="text"
                    value={adminName}
                    onChange={(event) => setAdminName(event.target.value)}
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    placeholder="Seu nome"
                    required
                  />
                </label>
              </>
            )}

            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                required
              />
            </label>

            {mode === "signup" && (
              <label>
                Confirmar senha
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            )}

            {mode === "signup" && (
              <div className="legal-checkbox-row auth-legal-checkbox">
                <input
                  id="signup-legal-accepted"
                  type="checkbox"
                  checked={signupLegalAccepted}
                  onChange={(event) =>
                    setSignupLegalAccepted(event.target.checked)
                  }
                  required
                />
                <span>
                  <label htmlFor="signup-legal-accepted">Li e aceito os </label>
                  <button
                    className="inline-legal-button"
                    type="button"
                    onClick={() => setLegalModal("terms")}
                  >
                    Termos do beta
                  </button>{" "}
                  e o{" "}
                  <button
                    className="inline-legal-button"
                    type="button"
                    onClick={() => setLegalModal("privacy")}
                  >
                    Aviso de Privacidade
                  </button>
                  .
                </span>
              </div>
            )}

            {message && <p className="auth-message">{message}</p>}

            <button
              className="capture-button auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Aguarde…"
                : mode === "login"
                  ? "Entrar"
                  : "Criar minha família"}
            </button>
          </form>
          <div className="auth-legal-links">
            <button type="button" onClick={() => setLegalModal("terms")}>
              Termos do beta
            </button>
            <span>·</span>
            <button type="button" onClick={() => setLegalModal("privacy")}>
              Privacidade
            </button>
          </div>
        </section>
        {legalModalElement}
      </>
    );
  }

  if (!legalStatus && !legalError) {
    return (
      <section className="processing-card" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Abrindo o Gestão de Compras</strong>
          <p>Carregando sua família diretamente no ambiente seguro…</p>
        </div>
      </section>
    );
  }

  if (legalError || !legalStatus) {
    return (
      <section className="feedback-card error-card" role="alert">
        <strong>Não foi possível verificar os documentos do beta</strong>
        <p>{legalError || "Status de aceite não encontrado."}</p>
        <div className="button-row">
          <button
            className="ghost-action"
            type="button"
            onClick={() => void supabase?.auth.signOut()}
          >
            Sair
          </button>
          <button
            className="capture-button"
            type="button"
            onClick={() => {
              setLegalError("");
              setLegalAttempt((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  if (!legalStatus.aceito) {
    return (
      <>
        <LegalAcceptance
          accessToken={session.access_token}
          status={legalStatus}
          onAccepted={(status) => {
            setLegalStatus(status);
            if (!context) {
              setContextError("");
              setContextAttempt((value) => value + 1);
            }
          }}
          onLogout={async () => {
            setLegalStatus(null);
            await supabase?.auth.signOut();
          }}
          onOpenDocument={setLegalModal}
        />
        {legalModalElement}
      </>
    );
  }

  if (!context && !contextError) {
    return (
      <section className="processing-card" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Abrindo sua família</strong>
          <p>Finalizando o acesso ao espaço compartilhado…</p>
        </div>
      </section>
    );
  }

  if (contextError || !context) {
    return (
      <section className="feedback-card error-card" role="alert">
        <strong>Não foi possível preparar sua família</strong>
        <p>{contextError || "Contexto familiar não encontrado."}</p>
        {contextSupportCode && (
          <small>Código de suporte: {contextSupportCode}</small>
        )}
        <div className="button-row">
          <button
            className="ghost-action"
            type="button"
            onClick={() => void supabase?.auth.signOut()}
          >
            Sair
          </button>
          <button
            className="capture-button"
            type="button"
            onClick={() => {
              setContextError("");
              setContextSupportCode("");
              setContextAttempt((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  return (
    <ApiAvailability
      apiUrl={apiUrl}
      accessToken={session.access_token}
      context={context}
      initialView={initialView}
      onContextRefresh={async () => {
        try {
          const nextContext = await fetchFamilyContextDirect(
            session.access_token,
          );
          setContext(nextContext);
          return nextContext;
        } catch {
          const nextContext = await fetchFamilyContext(
            apiUrl,
            session.access_token,
          );
          setContext(nextContext);
          return nextContext;
        }
      }}
      onLogout={async () => {
        sessionExpiredRef.current = false;
        setMessage("");
        setLegalStatus(null);
        await supabase?.auth.signOut();
      }}
      onAccountDeleted={async (successMessage) => {
        sessionExpiredRef.current = false;
        setContext(null);
        setContextError("");
        setLegalStatus(null);
        setSession(null);
        setMessage(successMessage);
        try {
          await supabase?.auth.signOut({ scope: "local" });
        } catch {
          // A conta já foi removida do servidor; a sessão local é descartada acima.
        }
      }}
    />
  );
}
