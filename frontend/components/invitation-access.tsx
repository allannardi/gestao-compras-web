"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { supabase, supabaseConfigured } from "@/lib/supabase";
import {
  acceptInvitationToken,
  fetchPublicInvitation,
} from "@/services/convites";
import type { ConvitePublico } from "@/types/convites";

type Props = {
  apiUrl: string;
  token: string;
};

type AccessMode = "signup" | "login";
type LoadState = "loading" | "ready" | "error";

function roleLabel(value: string): string {
  return value === "administrador" ? "Administrador" : "Membro";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (normalized.includes("user already registered")) {
    return "Este e-mail já possui uma conta. Use a opção Já tenho conta.";
  }
  if (normalized.includes("password")) {
    return "A senha não atende aos requisitos de segurança.";
  }
  return message;
}

export function InvitationAccess({ apiUrl, token }: Props) {
  const [state, setState] = useState<LoadState>("loading");
  const [invitation, setInvitation] = useState<ConvitePublico | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AccessMode>("signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchPublicInvitation(apiUrl, token, controller.signal)
      .then((result) => {
        setInvitation(result);
        setState("ready");
      })
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível abrir o convite.",
        );
        setState("error");
      });
    return () => controller.abort();
  }, [apiUrl, token]);

  const sessionMatches = useMemo(() => {
    if (!session?.user.email || !invitation) return false;
    return session.user.email.toLowerCase() === invitation.email.toLowerCase();
  }, [invitation, session]);

  const goToApp = () => window.location.replace("/");

  const acceptWithSession = async (activeSession: Session) => {
    await acceptInvitationToken(apiUrl, activeSession.access_token, token);
    setMessage("Convite aceito. Abrindo a família compartilhada…");
    window.setTimeout(goToApp, 500);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !invitation) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("As senhas informadas não são iguais.");
        }
        if (name.trim().length < 2) {
          throw new Error("Informe seu nome.");
        }

        const result = await supabase.auth.signUp({
          email: invitation.email,
          password,
          options: {
            data: {
              nome: name.trim(),
              convite_token: token,
            },
            emailRedirectTo: window.location.href,
          },
        });
        if (result.error) throw new Error(friendlyAuthError(result.error.message));
        if (!result.data.session) {
          throw new Error(
            "O Supabase ainda exige confirmação por e-mail. Desative Confirm email para concluir o acesso imediatamente.",
          );
        }
        setMessage("Acesso criado. Abrindo a família compartilhada…");
        window.setTimeout(goToApp, 500);
      } else {
        const result = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });
        if (result.error) throw new Error(friendlyAuthError(result.error.message));
        if (!result.data.session) throw new Error("Não foi possível iniciar a sessão.");
        await acceptWithSession(result.data.session);
      }
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível concluir o acesso.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!supabaseConfigured) {
    return (
      <section className="feedback-card error-card" role="alert">
        <strong>Supabase ainda não configurado</strong>
        <p>As variáveis públicas do Supabase não estão disponíveis.</p>
      </section>
    );
  }

  if (state === "loading") {
    return (
      <section className="processing-card" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Abrindo convite</strong>
          <p>Validando o link e preparando seu acesso…</p>
        </div>
      </section>
    );
  }

  if (state === "error" || !invitation) {
    return (
      <section className="feedback-card error-card" role="alert">
        <strong>Não foi possível abrir o convite</strong>
        <p>{error || "Convite inválido."}</p>
        <Link className="capture-button invitation-home-link" href="/">
          Voltar para o aplicativo
        </Link>
      </section>
    );
  }

  return (
    <section className="invitation-shell">
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
        <p>CONVITE PARA A FAMÍLIA</p>
      </section>

      <section className="invitation-summary-card">
        <p className="eyebrow">Você foi convidado</p>
        <h1>{invitation.familia_nome}</h1>
        <p>
          {invitation.convidado_por_nome} convidou você como {roleLabel(invitation.papel)}.
        </p>
        <div className="invitation-meta">
          <span>{invitation.email}</span>
          <small>Link válido até {formatDate(invitation.expira_em)}</small>
        </div>
      </section>

      {session ? (
        <section className="auth-card invitation-session-card">
          {sessionMatches ? (
            <>
              <strong>Conta identificada</strong>
              <p>Você está conectado como {session.user.email}.</p>
              {error && <p className="auth-message">{error}</p>}
              {message && <p className="auth-message success-inline">{message}</p>}
              <button
                className="capture-button auth-submit"
                type="button"
                disabled={submitting}
                onClick={() => {
                  setSubmitting(true);
                  setError("");
                  void acceptWithSession(session)
                    .catch((acceptError: unknown) =>
                      setError(
                        acceptError instanceof Error
                          ? acceptError.message
                          : "Não foi possível aceitar o convite.",
                      ),
                    )
                    .finally(() => setSubmitting(false));
                }}
              >
                {submitting ? "Entrando…" : "Aceitar convite e entrar"}
              </button>
            </>
          ) : (
            <>
              <strong>Outro usuário está conectado</strong>
              <p>
                Este convite pertence a {invitation.email}, mas a sessão atual é de {session.user.email}.
              </p>
              <button
                className="ghost-action full-width"
                type="button"
                onClick={() => void supabase?.auth.signOut()}
              >
                Sair desta conta
              </button>
            </>
          )}
        </section>
      ) : (
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-mode-copy">
            <strong>{mode === "signup" ? "Crie seu acesso" : "Entre com sua conta"}</strong>
            <span>
              {mode === "signup"
                ? "Defina seu nome e senha. Nenhuma nova família será criada."
                : "Use a senha da conta que já existe para este e-mail."}
            </span>
          </div>

          <div className="auth-tabs invitation-tabs">
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Criar meu acesso
            </button>
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Já tenho conta
            </button>
          </div>

          {mode === "signup" && (
            <label>
              Seu nome
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={100}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            E-mail do convite
            <input type="email" value={invitation.email} readOnly />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {error && <p className="auth-message">{error}</p>}
          {message && <p className="auth-message success-inline">{message}</p>}

          <button className="capture-button auth-submit" type="submit" disabled={submitting}>
            {submitting
              ? "Aguarde…"
              : mode === "signup"
                ? "Criar acesso e entrar na família"
                : "Entrar e aceitar convite"}
          </button>
        </form>
      )}
    </section>
  );
}
