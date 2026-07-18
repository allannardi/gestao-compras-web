"use client";

import { FormEvent, useState } from "react";

import { verifyCurrentPassword } from "@/lib/supabase";
import { deleteCurrentFamily, deleteOwnAccount } from "@/services/conta";
import type { FamilyContext } from "@/types/auth";
import type { ConfiguracoesData } from "@/types/configuracoes";

type Props = {
  apiUrl: string;
  context: FamilyContext;
  data: ConfiguracoesData;
  onAccountDeleted: (message: string) => Promise<void>;
  onFamilyDeleted: (message: string) => Promise<void>;
};

type Panel = "none" | "account" | "family";

function friendlyPasswordError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "A senha atual está incorreta.";
  }
  return message;
}

export function AccountPrivacyCard({
  apiUrl,
  context,
  data,
  onAccountDeleted,
  onFamilyDeleted,
}: Props) {
  const [panel, setPanel] = useState<Panel>("none");
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = data.familia.papel === "administrador";
  const hasOtherFamily = data.familias_disponiveis.some((family) => !family.atual);
  const familyCanBeDeleted =
    isAdmin && data.familia.membros_count === 1 && hasOtherFamily;

  const resetPanel = (nextPanel: Panel) => {
    setPanel(nextPanel);
    setConfirmation("");
    setPassword("");
    setUnderstood(false);
    setError("");
  };

  const verify = async (): Promise<string | null> => {
    const result = await verifyCurrentPassword(context.email, password);
    if (result.error || !result.accessToken) {
      setError(friendlyPasswordError(result.error ?? "Não foi possível confirmar sua senha."));
      return null;
    }
    return result.accessToken;
  };

  const submitAccountDeletion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (confirmation.trim().toLowerCase() !== context.email.trim().toLowerCase()) {
      setError("Digite exatamente o e-mail da sua conta.");
      return;
    }
    if (!understood) {
      setError("Confirme que você entende que a exclusão é definitiva.");
      return;
    }

    setBusy(true);
    try {
      const verifiedToken = await verify();
      if (!verifiedToken) return;
      const result = await deleteOwnAccount(
        apiUrl,
        verifiedToken,
        confirmation.trim(),
      );
      await onAccountDeleted(result.mensagem);
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível excluir sua conta.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitFamilyDeletion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (
      confirmation.trim().toLowerCase() !==
      data.familia.nome.trim().toLowerCase()
    ) {
      setError("Digite exatamente o nome da família.");
      return;
    }
    if (!understood) {
      setError("Confirme que você entende que os dados serão apagados.");
      return;
    }

    setBusy(true);
    try {
      const verifiedToken = await verify();
      if (!verifiedToken) return;
      const result = await deleteCurrentFamily(
        apiUrl,
        verifiedToken,
        confirmation.trim(),
      );
      await onFamilyDeleted(
        `${result.mensagem} A família atual agora é ${result.proxima_familia_nome}.`,
      );
      resetPanel("none");
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível excluir a família.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-card account-privacy-card">
      <div className="settings-card-heading">
        <div>
          <span>Privacidade e exclusão</span>
          <h3>Controle sua conta e seus dados</h3>
        </div>
      </div>

      <p className="settings-help-copy">
        Antes de excluir qualquer informação, use o backup em Excel ou JSON.
        As ações abaixo são definitivas e sempre exigem sua senha atual.
      </p>

      {error && <p className="account-danger-error">{error}</p>}

      {panel === "none" && (
        <div className="account-danger-actions">
          {isAdmin && (
            <div className="account-danger-option">
              <div>
                <strong>Excluir esta família</strong>
                <span>
                  Apaga compras, produtos, históricos, categorias e configurações
                  da família atual.
                </span>
                {!familyCanBeDeleted && (
                  <small>
                    Disponível somente quando você é o único membro e possui outra
                    família para continuar usando a conta.
                  </small>
                )}
              </div>
              <button
                type="button"
                className="danger-outline-button"
                disabled={!familyCanBeDeleted}
                onClick={() => resetPanel("family")}
              >
                Excluir família
              </button>
            </div>
          )}

          <div className="account-danger-option critical">
            <div>
              <strong>Excluir minha conta</strong>
              <span>
                Remove seu login e seus vínculos. Famílias em que você é o único
                membro também serão apagadas.
              </span>
              <small>
                Caso você seja o único administrador de uma família com outros
                membros, será necessário promover outro administrador primeiro.
              </small>
            </div>
            <button
              type="button"
              className="danger-solid-button"
              onClick={() => resetPanel("account")}
            >
              Excluir minha conta
            </button>
          </div>
        </div>
      )}

      {panel === "account" && (
        <form className="account-danger-form" onSubmit={submitAccountDeletion}>
          <div className="account-danger-warning">
            <strong>Esta ação não pode ser desfeita</strong>
            <p>
              Digite seu e-mail <b>{context.email}</b> e confirme sua senha atual.
            </p>
          </div>
          <label>
            E-mail de confirmação
            <input
              type="email"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Senha atual
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          <label className="danger-checkbox">
            <input
              type="checkbox"
              checked={understood}
              onChange={(event) => setUnderstood(event.target.checked)}
            />
            <span>Entendo que minha conta será excluída definitivamente.</span>
          </label>
          <div className="button-row account-danger-form-actions">
            <button
              className="ghost-action"
              type="button"
              disabled={busy}
              onClick={() => resetPanel("none")}
            >
              Cancelar
            </button>
            <button className="danger-solid-button" type="submit" disabled={busy}>
              {busy ? "Excluindo…" : "Confirmar exclusão da conta"}
            </button>
          </div>
        </form>
      )}

      {panel === "family" && (
        <form className="account-danger-form" onSubmit={submitFamilyDeletion}>
          <div className="account-danger-warning">
            <strong>Todos os dados desta família serão apagados</strong>
            <p>
              Digite <b>{data.familia.nome}</b> e confirme sua senha atual.
            </p>
          </div>
          <label>
            Nome da família
            <input
              type="text"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </label>
          <label>
            Senha atual
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          <label className="danger-checkbox">
            <input
              type="checkbox"
              checked={understood}
              onChange={(event) => setUnderstood(event.target.checked)}
            />
            <span>Entendo que os dados desta família serão apagados.</span>
          </label>
          <div className="button-row account-danger-form-actions">
            <button
              className="ghost-action"
              type="button"
              disabled={busy}
              onClick={() => resetPanel("none")}
            >
              Cancelar
            </button>
            <button className="danger-solid-button" type="submit" disabled={busy}>
              {busy ? "Excluindo…" : "Confirmar exclusão da família"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
