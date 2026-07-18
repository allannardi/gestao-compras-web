"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { supabase, supabaseConfigured } from "@/lib/supabase";

type RecoveryState = "loading" | "ready" | "success" | "error";

function friendlyRecoveryError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("expired") || normalized.includes("invalid")) {
    return "O link de redefinição é inválido ou expirou. Peça um novo envio ao administrador.";
  }
  if (normalized.includes("password")) {
    return "A nova senha não atende aos requisitos de segurança.";
  }
  return message;
}

export function PasswordRecovery() {
  const [state, setState] = useState<RecoveryState>("loading");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    const url = new URL(window.location.href);
    const hasRecoveryMarker =
      url.hash.includes("type=recovery") ||
      url.searchParams.has("code") ||
      url.searchParams.get("type") === "recovery";
    let active = true;
    let resolved = false;
    const timeout = window.setTimeout(() => {
      if (active && !resolved) {
        setState("error");
        setMessage(
          "Não foi possível validar o link. Peça um novo e-mail de redefinição.",
        );
      }
    }, 12_000);

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        resolved = true;
        setState("error");
        setMessage(friendlyRecoveryError(error.message));
        return;
      }
      if (data.session && hasRecoveryMarker) {
        resolved = true;
        setState("ready");
      }
    });

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        resolved = true;
        setState("ready");
        setMessage("");
      }
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setState("error");
      setMessage("Supabase ainda não foi configurado.");
      return;
    }
    if (newPassword.length < 8) {
      setMessage("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("A confirmação da senha não confere.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(friendlyRecoveryError(error.message));
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    setNewPassword("");
    setConfirmPassword("");
    setState("success");
    setMessage("Senha redefinida com sucesso. Entre novamente com a nova senha.");
    setSubmitting(false);
  };

  if (!supabaseConfigured) {
    return (
      <section className="feedback-card error-card" role="alert">
        <strong>Supabase ainda não configurado</strong>
        <p>As variáveis públicas do Supabase não foram encontradas.</p>
      </section>
    );
  }

  return (
    <section className="password-recovery-shell">
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
        <p>REDEFINA A SUA SENHA</p>
      </section>

      {state === "loading" && (
        <section className="processing-card" role="status">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>Validando o link</strong>
            <p>Preparando uma sessão segura para a redefinição…</p>
          </div>
        </section>
      )}

      {state === "ready" && (
        <form className="auth-card password-recovery-card" onSubmit={submit}>
          <div className="auth-mode-copy">
            <strong>Escolha uma nova senha</strong>
            <span>Use pelo menos 8 caracteres e não compartilhe sua senha.</span>
          </div>

          <label>
            Nova senha
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label>
            Confirmar nova senha
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          {message && <p className="auth-message">{message}</p>}

          <button
            className="capture-button auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Redefinindo…" : "Salvar nova senha"}
          </button>
        </form>
      )}

      {state === "success" && (
        <section className="feedback-card success-card" role="status">
          <strong>Senha atualizada</strong>
          <p>{message}</p>
          <Link className="capture-button password-home-link" href="/">
            Voltar para o login
          </Link>
        </section>
      )}

      {state === "error" && (
        <section className="feedback-card error-card" role="alert">
          <strong>Não foi possível redefinir a senha</strong>
          <p>{message}</p>
          <Link className="ghost-action password-home-link" href="/">
            Voltar ao início
          </Link>
        </section>
      )}
    </section>
  );
}
