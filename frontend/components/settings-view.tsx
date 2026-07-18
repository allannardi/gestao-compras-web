"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  fetchSettings,
  generateInvitationLink,
  removeMember,
  requestMemberPasswordReset,
  selectFamily,
  updateFamily,
  updateMemberRole,
  updateProfile,
} from "@/services/configuracoes";
import { changePasswordWithCurrentPassword } from "@/lib/supabase";
import { AccountPrivacyCard } from "@/components/account-privacy-card";
import { ExportsCard } from "@/components/exports-card";
import type { FamilyContext } from "@/types/auth";
import type {
  ConfiguracoesData,
  MembroFamilia,
} from "@/types/configuracoes";

type LoadState = "loading" | "ready" | "error";

type Props = {
  apiUrl: string;
  accessToken: string;
  context: FamilyContext;
  onContextRefresh: () => Promise<FamilyContext>;
  onAccountDeleted: (message: string) => Promise<void>;
  onFamilyDeleted: (message: string) => Promise<void>;
  onClose: () => void;
};

function roleLabel(value: string): string {
  return value === "administrador" ? "Administrador" : "Membro";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function SettingsView({
  apiUrl,
  accessToken,
  context,
  onContextRefresh,
  onAccountDeleted,
  onFamilyDeleted,
  onClose,
}: Props) {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<ConfiguracoesData | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [profileName, setProfileName] = useState(context.nome);
  const [familyName, setFamilyName] = useState(context.familia_nome);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("membro");
  const [busyAction, setBusyAction] = useState("");
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const result = await fetchSettings(apiUrl, accessToken);
      setData(result);
      setProfileName(result.perfil.nome);
      setFamilyName(result.familia.nome);
      setState("ready");
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as configurações.",
      );
      setState("error");
    }
  }, [accessToken, apiUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const isAdmin = data?.familia.papel === "administrador";
  const availableSlots = useMemo(() => {
    if (!data) return 0;
    return Math.max(
      data.familia.limite_usuarios -
        data.familia.membros_count -
        data.convites_enviados.length,
      0,
    );
  }, [data]);

  const runAction = async (
    actionKey: string,
    action: () => Promise<{ mensagem: string }>,
    options?: { refreshContext?: boolean; closeAfter?: boolean },
  ): Promise<boolean> => {
    setBusyAction(actionKey);
    setMessage("");
    setError("");
    try {
      const result = await action();
      setMessage(result.mensagem);
      if (options?.refreshContext) {
        await onContextRefresh();
      }
      await load();
      if (options?.closeAfter) {
        onClose();
      }
      return true;
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível concluir a ação.",
      );
      return false;
    } finally {
      setBusyAction("");
    }
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction(
      "profile",
      () => updateProfile(apiUrl, accessToken, profileName.trim()),
      { refreshContext: true },
    );
  };

  const submitFamily = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction(
      "family",
      () => updateFamily(apiUrl, accessToken, familyName.trim()),
      { refreshContext: true },
    );
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("A nova senha precisa ser diferente da senha atual.");
      return;
    }

    setBusyAction("password");
    try {
      const result = await changePasswordWithCurrentPassword(
        data?.perfil.email ?? context.email,
        currentPassword,
        newPassword,
      );

      if (result.error) {
        const normalized = result.error.toLowerCase();
        if (normalized.includes("invalid login credentials")) {
          setError("A senha atual está incorreta.");
        } else if (normalized.includes("password")) {
          setError("Não foi possível alterar a senha. Verifique os requisitos e tente novamente.");
        } else {
          setError(result.error);
        }
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setMessage("Sua senha foi alterada com sucesso.");
    } catch {
      setError("Não foi possível alterar a senha. Tente novamente em instantes.");
    } finally {
      setBusyAction("");
    }
  };

  const copyInvitationLink = async (invitationId: string, token: string) => {
    const link = `${window.location.origin}/convite/${token}`;
    const invitationMessage =
      `Você foi convidado para participar do Gestão de Compras.\n\n` +
      `Clique no link: ${link}`;
    try {
      await navigator.clipboard.writeText(invitationMessage);
    } catch {
      const input = document.createElement("textarea");
      input.value = invitationMessage;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setGeneratedLinks((current) => ({ ...current, [invitationId]: link }));
    setMessage("Mensagem do convite copiada. Agora é só colar no WhatsApp.");
  };

  const submitInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("invite");
    setMessage("");
    setError("");
    try {
      const result = await createInvitation(
        apiUrl,
        accessToken,
        inviteEmail.trim(),
        inviteRole,
      );
      await copyInvitationLink(result.id, result.token);
      setInviteEmail("");
      await load();
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível criar o convite.",
      );
    } finally {
      setBusyAction("");
    }
  };

  const changeMemberRole = (member: MembroFamilia, nextRole: string) => {
    if (nextRole === member.papel) return;
    void runAction(`role-${member.usuario_id}`, () =>
      updateMemberRole(
        apiUrl,
        accessToken,
        member.usuario_id,
        nextRole,
      ),
    );
  };

  if (state === "loading" && !data) {
    return (
      <section className="processing-card settings-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Carregando configurações</strong>
          <p>Preparando família, membros e convites…</p>
        </div>
      </section>
    );
  }

  if (state === "error" && !data) {
    return (
      <section className="feedback-card error-card" role="alert">
        <strong>Não foi possível abrir as configurações</strong>
        <p>{error}</p>
        <button className="capture-button" type="button" onClick={() => void load()}>
          Tentar novamente
        </button>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="settings-section">
      <div className="settings-title-row">
        <div>
          <p className="eyebrow">Configurações</p>
          <h2>Família e membros</h2>
        </div>
        <button className="settings-close-button" type="button" onClick={onClose}>
          Voltar
        </button>
      </div>

      {(message || error) && (
        <section
          className={`feedback-card ${error ? "error-card" : "success-card"}`}
          role={error ? "alert" : "status"}
        >
          <strong>{error ? "Atenção" : "Tudo certo"}</strong>
          <p>{error || message}</p>
        </section>
      )}

      {data.convites_recebidos.length > 0 && (
        <section className="settings-card invitation-received-card">
          <div className="settings-card-heading">
            <div>
              <span>Convites recebidos</span>
              <h3>Entre em uma família compartilhada</h3>
            </div>
          </div>
          <div className="settings-list">
            {data.convites_recebidos.map((invitation) => (
              <article key={invitation.id} className="invitation-card">
                <div>
                  <strong>{invitation.familia_nome}</strong>
                  <span>
                    Convite de {invitation.convidado_por_nome} · {roleLabel(invitation.papel)}
                  </span>
                  <small>Expira em {formatDateTime(invitation.expira_em)}</small>
                </div>
                <button
                  className="capture-button compact-button"
                  type="button"
                  disabled={busyAction === `accept-${invitation.id}`}
                  onClick={() =>
                    void runAction(
                      `accept-${invitation.id}`,
                      () => acceptInvitation(apiUrl, accessToken, invitation.id),
                      { refreshContext: true },
                    )
                  }
                >
                  {busyAction === `accept-${invitation.id}` ? "Entrando…" : "Aceitar"}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <span>Meu perfil</span>
            <h3>Seus dados</h3>
          </div>
          <small>{data.perfil.email}</small>
        </div>
        <form className="settings-form" onSubmit={submitProfile}>
          <label>
            Nome exibido
            <input
              type="text"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <button
            className="capture-button"
            type="submit"
            disabled={busyAction === "profile" || profileName.trim() === data.perfil.nome}
          >
            {busyAction === "profile" ? "Salvando…" : "Salvar meu nome"}
          </button>
        </form>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <span>Família atual</span>
            <h3>{data.familia.nome}</h3>
          </div>
          <small>
            {data.familia.membros_count}/{data.familia.limite_usuarios} membros · {roleLabel(data.familia.papel)}
          </small>
        </div>

        {isAdmin && (
          <form className="settings-form" onSubmit={submitFamily}>
            <label>
              Nome da família
              <input
                type="text"
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            <button
              className="capture-button"
              type="submit"
              disabled={busyAction === "family" || familyName.trim() === data.familia.nome}
            >
              {busyAction === "family" ? "Salvando…" : "Salvar nome da família"}
            </button>
          </form>
        )}

        {data.familias_disponiveis.length > 1 && (
          <div className="family-switch-list">
            <strong>Suas famílias</strong>
            {data.familias_disponiveis.map((family) => (
              <article key={family.id}>
                <div>
                  <b>{family.nome}</b>
                  <span>{roleLabel(family.papel)}</span>
                </div>
                {family.atual ? (
                  <small>Atual</small>
                ) : (
                  <button
                    type="button"
                    disabled={busyAction === `family-${family.id}`}
                    onClick={() =>
                      void runAction(
                        `family-${family.id}`,
                        () => selectFamily(apiUrl, accessToken, family.id),
                        { refreshContext: true },
                      )
                    }
                  >
                    {busyAction === `family-${family.id}` ? "Trocando…" : "Usar"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <span>Membros</span>
            <h3>Pessoas com acesso</h3>
          </div>
        </div>
        <div className="member-list">
          {data.membros.map((member) => (
            <article key={member.usuario_id} className="member-card">
              <div className="member-copy">
                <strong>{member.nome}</strong>
                <span>{member.email}</span>
                <small>{member.atual ? "Você · " : ""}{roleLabel(member.papel)}</small>
              </div>

              {isAdmin && !member.atual ? (
                <div className="member-actions">
                  <select
                    value={member.papel}
                    aria-label={`Papel de ${member.nome}`}
                    disabled={busyAction === `role-${member.usuario_id}`}
                    onChange={(event) => changeMemberRole(member, event.target.value)}
                  >
                    <option value="membro">Membro</option>
                    <option value="administrador">Administrador</option>
                  </select>
                  <button
                    type="button"
                    className="member-reset-button"
                    disabled={busyAction === `reset-${member.usuario_id}`}
                    onClick={() => {
                      if (!window.confirm(`Enviar um e-mail de redefinição de senha para ${member.nome}?`)) return;
                      void runAction(`reset-${member.usuario_id}`, () =>
                        requestMemberPasswordReset(
                          apiUrl,
                          accessToken,
                          member.usuario_id,
                        ),
                      );
                    }}
                  >
                    {busyAction === `reset-${member.usuario_id}`
                      ? "Enviando…"
                      : "Redefinir senha"}
                  </button>
                  <button
                    type="button"
                    className="danger-text-button"
                    disabled={busyAction === `remove-${member.usuario_id}`}
                    onClick={() => {
                      if (!window.confirm(`Remover ${member.nome} desta família?`)) return;
                      void runAction(`remove-${member.usuario_id}`, () =>
                        removeMember(apiUrl, accessToken, member.usuario_id),
                      );
                    }}
                  >
                    {busyAction === `remove-${member.usuario_id}` ? "Removendo…" : "Remover"}
                  </button>
                </div>
              ) : (
                <span className="member-role-badge">{roleLabel(member.papel)}</span>
              )}
            </article>
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="settings-card">
          <div className="settings-card-heading">
            <div>
              <span>Convidar membro</span>
              <h3>Compartilhe a família</h3>
            </div>
            <small>{availableSlots} vaga{availableSlots === 1 ? "" : "s"}</small>
          </div>
          <p className="settings-help-copy">
            Cadastre o e-mail exato e envie o link gerado. A pessoa poderá criar a própria senha sem criar uma família paralela.
          </p>
          <form className="invite-form" onSubmit={submitInvitation}>
            <label>
              E-mail do convidado
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="pessoa@email.com"
                maxLength={254}
                required
              />
            </label>
            <label>
              Papel
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                <option value="membro">Membro</option>
                <option value="administrador">Administrador</option>
              </select>
            </label>
            <button
              className="capture-button"
              type="submit"
              disabled={busyAction === "invite" || availableSlots === 0}
            >
              {busyAction === "invite" ? "Criando convite…" : "Criar convite"}
            </button>
          </form>

          {data.convites_enviados.length > 0 && (
            <div className="sent-invitation-list">
              <strong>Convites pendentes</strong>
              {data.convites_enviados.map((invitation) => (
                <article key={invitation.id}>
                  <div>
                    <b>{invitation.email}</b>
                    <span>{roleLabel(invitation.papel)} · expira em {formatDateTime(invitation.expira_em)}</span>
                  </div>
                  <div className="sent-invitation-actions">
                    <button
                      type="button"
                      disabled={busyAction === `link-${invitation.id}`}
                      onClick={() => {
                        setBusyAction(`link-${invitation.id}`);
                        setError("");
                        void generateInvitationLink(apiUrl, accessToken, invitation.id)
                          .then((result) => copyInvitationLink(result.id, result.token))
                          .catch((linkError: unknown) =>
                            setError(
                              linkError instanceof Error
                                ? linkError.message
                                : "Não foi possível gerar o link.",
                            ),
                          )
                          .finally(() => setBusyAction(""));
                      }}
                    >
                      {busyAction === `link-${invitation.id}` ? "Gerando…" : "Copiar mensagem"}
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === `cancel-${invitation.id}`}
                      onClick={() =>
                        void runAction(`cancel-${invitation.id}`, () =>
                          cancelInvitation(apiUrl, accessToken, invitation.id),
                        )
                      }
                    >
                      {busyAction === `cancel-${invitation.id}` ? "Cancelando…" : "Cancelar"}
                    </button>
                  </div>
                  {generatedLinks[invitation.id] && (
                    <small className="invitation-link-preview">Mensagem copiada e pronta para o WhatsApp.</small>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <ExportsCard apiUrl={apiUrl} accessToken={accessToken} />
      )}

      <AccountPrivacyCard
        apiUrl={apiUrl}
        context={context}
        data={data}
        onAccountDeleted={onAccountDeleted}
        onFamilyDeleted={onFamilyDeleted}
      />

      <section className="settings-card settings-security-card">
        <div className="settings-card-heading">
          <div>
            <span>Segurança</span>
            <h3>Minha senha</h3>
          </div>
          <small>Mínimo de 8 caracteres</small>
        </div>
        <p className="settings-help-copy">
          Confirme a senha atual e escolha uma nova senha para o seu acesso.
        </p>
        <form className="settings-password-form" onSubmit={submitPassword}>
          <label>
            Senha atual
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
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
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <button
            className="capture-button"
            type="submit"
            disabled={busyAction === "password"}
          >
            {busyAction === "password" ? "Alterando…" : "Alterar minha senha"}
          </button>
        </form>
      </section>
    </section>
  );
}
