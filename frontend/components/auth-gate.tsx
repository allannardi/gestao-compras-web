"use client";

import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useState } from "react";

import { ApiAvailability } from "@/components/api-availability";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { fetchFamilyContext } from "@/services/auth-context";
import type { FamilyContext } from "@/types/auth";

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
    return "Confirme o e-mail recebido antes de entrar.";
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
  const [contextAttempt, setContextAttempt] = useState(0);
  const [contextError, setContextError] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [familyName, setFamilyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setContext(null);
      setContextError("");
      setSessionLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
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

        setContextError(
          error instanceof Error
            ? error.message
            : "Não foi possível preparar o acesso da família.",
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [apiUrl, contextAttempt, session]);

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
        "Família criada. Confirme o e-mail recebido e depois entre no aplicativo.",
      );
      setMode("login");
      setPassword("");
      setConfirmPassword("");
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
        <div className="hero-card compact-hero">
          <div>
            <p className="eyebrow">Gestão de Compras Web</p>
            <h1>{mode === "login" ? "Acesse sua família" : "Crie sua família"}</h1>
            <p className="subtitle">
              Cada família possui seus próprios membros e dados, completamente
              separados das demais contas.
            </p>
          </div>
        </div>

        <form className="auth-card" onSubmit={submit}>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setMessage("");
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

          {message && <p className="auth-message">{message}</p>}

          <button className="capture-button auth-submit" type="submit" disabled={submitting}>
            {submitting
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar"
                : "Criar minha família"}
          </button>
        </form>
      </section>
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
      onLogout={async () => {
        await supabase?.auth.signOut();
      }}
    />
  );
}
