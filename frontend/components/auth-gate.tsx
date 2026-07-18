"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useRef, useState } from "react";

import { ApiAvailability } from "@/components/api-availability";
import { LegalAcceptance } from "@/components/legal-acceptance";
import { ApiRequestError, SESSION_EXPIRED_EVENT } from "@/lib/api-client";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";
import { fetchFamilyContext } from "@/services/auth-context";
import { fetchLegalAcceptance, reportTechnicalEvent } from "@/services/beta";
import type { FamilyContext } from "@/types/auth";
import type { AceiteLegalStatus } from "@/types/beta";

type Props = {
  apiUrl: string;
};

type AuthMode = "login" | "signup";

const CONTEXT_TIMEOUT_MS = 75_000;

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

export function AuthGate({ apiUrl }: Props) {
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
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sessionExpiredRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        sessionExpiredRef.current = false;
      }

      setSession(nextSession);
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

  useEffect(() => {
    if (!session) {
      return;
    }

    const controller = new AbortController();
    void fetchLegalAcceptance(apiUrl, session.access_token, controller.signal)
      .then((status) => setLegalStatus(status))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLegalError(
          error instanceof Error
            ? error.message
            : "Não foi possível verificar os documentos do beta.",
        );
      })
;

    return () => controller.abort();
  }, [apiUrl, legalAttempt, session]);

  useEffect(() => {
    if (!session || !legalStatus?.aceito) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      CONTEXT_TIMEOUT_MS,
    );

    void fetchFamilyContext(apiUrl, session.access_token, controller.signal)
      .then((nextContext) => setContext(nextContext))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          setContextError(
            "O servidor demorou para responder. Aguarde alguns segundos e tente novamente.",
          );
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível preparar o acesso da família.";
        const supportCode =
          error instanceof ApiRequestError ? error.requestId : "";
        setContextError(message);
        setContextSupportCode(supportCode);

        void reportTechnicalEvent(apiUrl, session.access_token, {
          evento: "contexto_familia_falhou",
          pagina: "/",
          app_version: APP_VERSION,
          codigo:
            error instanceof ApiRequestError ? error.code : "CONTEXT_UNKNOWN",
          ...(supportCode ? { request_id: supportCode } : {}),
        }).catch(() => undefined);
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [apiUrl, contextAttempt, legalStatus?.aceito, session]);

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
      setMessage("Leia e confirme os Termos e o Aviso de Privacidade para criar a conta.");
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
    } else if (mode === "signup" && !result.data.session) {
      setMessage(
        "A família foi criada, mas o Supabase ainda exige confirmação por e-mail. Desative Confirm email nas configurações de autenticação.",
      );
      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } else {
      sessionExpiredRef.current = false;
      setMessage("");
    }

    setSubmitting(false);
  };

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
            <strong>{mode === "login" ? "Bem-vindo de volta" : "Crie o espaço da sua família"}</strong>
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
            <label className="legal-checkbox-row auth-legal-checkbox">
              <input
                type="checkbox"
                checked={signupLegalAccepted}
                onChange={(event) => setSignupLegalAccepted(event.target.checked)}
                required
              />
              <span>
                Li e aceito os <Link href="/termos" target="_blank">Termos do beta</Link>{" "}
                e o <Link href="/politica-de-privacidade" target="_blank">Aviso de Privacidade</Link>.
              </span>
            </label>
          )}

          {message && <p className="auth-message">{message}</p>}

          <button className="capture-button auth-submit" type="submit" disabled={submitting}>
            {submitting
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar"
                : "Criar minha família"}
          </button>
        </form>
        <div className="auth-legal-links">
          <Link href="/termos">Termos do beta</Link>
          <span>·</span>
          <Link href="/politica-de-privacidade">Privacidade</Link>
        </div>
      </section>
    );
  }

  if (!legalStatus && !legalError) {
    return (
      <section className="processing-card" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Preparando o beta controlado</strong>
          <p>Verificando termos, privacidade e segurança da conta…</p>
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
          <button className="ghost-action" type="button" onClick={() => void supabase?.auth.signOut()}>
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
      <LegalAcceptance
        apiUrl={apiUrl}
        accessToken={session.access_token}
        status={legalStatus}
        onAccepted={setLegalStatus}
        onLogout={async () => {
          setLegalStatus(null);
          await supabase?.auth.signOut();
        }}
      />
    );
  }

  if (!context && !contextError) {
    return (
      <section className="processing-card" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Preparando sua família</strong>
          <p>Validando a sessão e carregando o espaço compartilhado…</p>
        </div>
      </section>
    );
  }

  if (contextError || !context) {
    return (
      <section className="feedback-card error-card" role="alert">
        <strong>Não foi possível preparar sua família</strong>
        <p>{contextError || "Contexto familiar não encontrado."}</p>
        {contextSupportCode && <small>Código de suporte: {contextSupportCode}</small>}
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
      onContextRefresh={async () => {
        const nextContext = await fetchFamilyContext(
          apiUrl,
          session.access_token,
        );
        setContext(nextContext);
        return nextContext;
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
