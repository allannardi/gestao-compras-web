"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import {
  changeAdminFamilyStatus,
  deleteAdminFamily,
  deleteAdminUser,
  fetchAdminAudit,
  fetchAdminFamilies,
  fetchAdminFamily,
  fetchAdminSummary,
  fetchAdminUser,
  fetchAdminUsers,
  removeAdminMember,
  resetAdminUserPassword,
  updateAdminFamily,
  updateAdminMemberRole,
} from "@/services/admin-geral";
import type {
  AdminAuditoriaLista,
  AdminFamiliaDetalhes,
  AdminFamiliasLista,
  AdminResumo,
  AdminUsuarioDetalhes,
  AdminUsuariosLista,
} from "@/types/admin-geral";

type Tab = "resumo" | "familias" | "usuarios" | "auditoria";

type Props = {
  apiUrl: string;
  accessToken: string;
  onContextRefresh: () => Promise<unknown>;
  onClose: () => void;
};

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: string): string {
  if (status === "ativa") return "Ativa";
  if (status === "suspensa") return "Suspensa";
  if (status === "cancelada") return "Cancelada";
  return status;
}

function actionError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a ação administrativa.";
}

export function AdminGeralView({
  apiUrl,
  accessToken,
  onContextRefresh,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("resumo");
  const [summary, setSummary] = useState<AdminResumo | null>(null);
  const [families, setFamilies] = useState<AdminFamiliasLista | null>(null);
  const [users, setUsers] = useState<AdminUsuariosLista | null>(null);
  const [audit, setAudit] = useState<AdminAuditoriaLista | null>(null);
  const [familyDetail, setFamilyDetail] = useState<AdminFamiliaDetalhes | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUsuarioDetalhes | null>(null);
  const [familySearch, setFamilySearch] = useState("");
  const [familyStatus, setFamilyStatus] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSummary(await fetchAdminSummary(apiUrl, accessToken));
    } catch (loadError: unknown) {
      setError(actionError(loadError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl]);

  const loadFamilies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFamilies(
        await fetchAdminFamilies(
          apiUrl,
          accessToken,
          familySearch,
          familyStatus,
        ),
      );
    } catch (loadError: unknown) {
      setError(actionError(loadError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl, familySearch, familyStatus]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await fetchAdminUsers(apiUrl, accessToken, userSearch));
    } catch (loadError: unknown) {
      setError(actionError(loadError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl, userSearch]);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAudit(await fetchAdminAudit(apiUrl, accessToken, auditSearch));
    } catch (loadError: unknown) {
      setError(actionError(loadError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl, auditSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSummary(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);

  const openTab = (nextTab: Tab) => {
    setTab(nextTab);
    setFamilyDetail(null);
    setUserDetail(null);
    setMessage("");
    setError("");
    if (nextTab === "resumo") void loadSummary();
    if (nextTab === "familias") void loadFamilies();
    if (nextTab === "usuarios") void loadUsers();
    if (nextTab === "auditoria") void loadAudit();
  };

  const run = async (key: string, action: () => Promise<{ mensagem: string }>) => {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      const result = await action();
      setMessage(result.mensagem);
      await Promise.allSettled([
        loadSummary(),
        loadFamilies(),
        loadUsers(),
        loadAudit(),
      ]);
      return true;
    } catch (runError: unknown) {
      setError(actionError(runError));
      return false;
    } finally {
      setBusy("");
    }
  };

  const openFamily = async (familyId: string) => {
    setLoading(true);
    setError("");
    try {
      setFamilyDetail(await fetchAdminFamily(apiUrl, accessToken, familyId));
    } catch (loadError: unknown) {
      setError(actionError(loadError));
    } finally {
      setLoading(false);
    }
  };

  const openUser = async (userId: string) => {
    setLoading(true);
    setError("");
    try {
      setUserDetail(await fetchAdminUser(apiUrl, accessToken, userId));
    } catch (loadError: unknown) {
      setError(actionError(loadError));
    } finally {
      setLoading(false);
    }
  };

  const editFamily = async () => {
    if (!familyDetail) return;
    const family = familyDetail.familia;
    const name = window.prompt("Novo nome da família:", family.nome);
    if (name === null) return;
    const note = window.prompt(
      "Observação administrativa (pode ficar vazia):",
      family.observacao_admin ?? "",
    );
    if (note === null) return;

    const success = await run(`edit-family-${family.id}`, () =>
      updateAdminFamily(apiUrl, accessToken, family.id, {
        nome: name.trim(),
        observacao: note.trim(),
      }),
    );
    if (success) await openFamily(family.id);
  };

  const toggleFamilyStatus = async () => {
    if (!familyDetail) return;
    const family = familyDetail.familia;
    const action = family.status === "suspensa" ? "reativar" : "suspender";
    const reason = window.prompt(
      `${action === "suspender" ? "Motivo da suspensão" : "Motivo da reativação"}:`,
      "",
    );
    if (!reason?.trim()) return;
    const success = await run(`${action}-${family.id}`, () =>
      changeAdminFamilyStatus(
        apiUrl,
        accessToken,
        family.id,
        action,
        reason.trim(),
      ),
    );
    if (success) await openFamily(family.id);
  };

  const permanentlyDeleteFamily = async () => {
    if (!familyDetail) return;
    const family = familyDetail.familia;
    const typedName = window.prompt(
      `Exclusão irreversível. Digite exatamente o nome da família:\n${family.nome}`,
      "",
    );
    if (typedName === null) return;
    const phrase = window.prompt("Digite EXCLUIR DEFINITIVAMENTE:", "");
    if (phrase === null) return;
    const reason = window.prompt("Informe o motivo da exclusão:", "Limpeza de dados de teste");
    if (!reason?.trim()) return;

    const success = await run(`delete-family-${family.id}`, () =>
      deleteAdminFamily(apiUrl, accessToken, family.id, {
        nome_confirmacao: typedName,
        confirmacao: phrase,
        motivo: reason.trim(),
      }),
    );
    if (success) {
      setFamilyDetail(null);
      await onContextRefresh().catch(() => undefined);
    }
  };

  const changeMemberRole = async (userId: string, currentRole: string) => {
    if (!familyDetail) return;
    const nextRole = currentRole === "administrador" ? "membro" : "administrador";
    if (!window.confirm(`Alterar o papel para ${nextRole}?`)) return;
    const success = await run(`member-role-${userId}`, () =>
      updateAdminMemberRole(
        apiUrl,
        accessToken,
        familyDetail.familia.id,
        userId,
        nextRole,
      ),
    );
    if (success) await openFamily(familyDetail.familia.id);
  };

  const removeMember = async (userId: string, name: string) => {
    if (!familyDetail) return;
    if (!window.confirm(`Remover ${name} desta família? A conta do usuário será mantida.`)) return;
    const success = await run(`remove-member-${userId}`, () =>
      removeAdminMember(apiUrl, accessToken, familyDetail.familia.id, userId),
    );
    if (success) await openFamily(familyDetail.familia.id);
  };

  const resetUserPassword = async () => {
    if (!userDetail) return;
    const user = userDetail.usuario;
    if (!window.confirm(`Enviar redefinição de senha para ${user.email}?`)) return;
    await run(`reset-user-${user.id}`, () =>
      resetAdminUserPassword(apiUrl, accessToken, user.id),
    );
  };

  const permanentlyDeleteUser = async () => {
    if (!userDetail) return;
    const user = userDetail.usuario;
    const typedEmail = window.prompt(
      `Exclusão irreversível. Digite exatamente o e-mail:\n${user.email}`,
      "",
    );
    if (typedEmail === null) return;
    const phrase = window.prompt("Digite EXCLUIR DEFINITIVAMENTE:", "");
    if (phrase === null) return;
    const reason = window.prompt("Informe o motivo da exclusão:", "Limpeza de usuário de teste");
    if (!reason?.trim()) return;

    const success = await run(`delete-user-${user.id}`, () =>
      deleteAdminUser(apiUrl, accessToken, user.id, {
        email_confirmacao: typedEmail,
        confirmacao: phrase,
        motivo: reason.trim(),
      }),
    );
    if (success) setUserDetail(null);
  };

  const submitFamilySearch = (event: FormEvent) => {
    event.preventDefault();
    void loadFamilies();
  };
  const submitUserSearch = (event: FormEvent) => {
    event.preventDefault();
    void loadUsers();
  };
  const submitAuditSearch = (event: FormEvent) => {
    event.preventDefault();
    void loadAudit();
  };

  return (
    <section className="admin-general-section">
      <div className="settings-title-row">
        <div>
          <p className="eyebrow">Admin Geral</p>
          <h2>Painel do sistema</h2>
        </div>
        <button className="settings-close-button" type="button" onClick={onClose}>
          Voltar ao app
        </button>
      </div>

      <section className="admin-privacy-note">
        <strong>Visão operacional</strong>
        <p>
          Este painel mostra contas, famílias e contagens. Produtos comprados,
          preços e detalhes das notas não são exibidos.
        </p>
      </section>

      <nav className="admin-tabs" aria-label="Áreas do Admin Geral">
        {(["resumo", "familias", "usuarios", "auditoria"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? "active" : ""}
            onClick={() => openTab(item)}
          >
            {item === "resumo"
              ? "Resumo"
              : item === "familias"
                ? "Famílias"
                : item === "usuarios"
                  ? "Usuários"
                  : "Auditoria"}
          </button>
        ))}
      </nav>

      {(message || error) && (
        <section className={`feedback-card ${error ? "error-card" : "success-card"}`}>
          <strong>{error ? "Atenção" : "Tudo certo"}</strong>
          <p>{error || message}</p>
        </section>
      )}

      {loading && (
        <section className="processing-card" role="status">
          <span className="spinner" aria-hidden="true" />
          <div><strong>Carregando Admin Geral</strong><p>Consultando os dados operacionais…</p></div>
        </section>
      )}

      {!loading && tab === "resumo" && summary && (
        <div className="admin-summary-grid">
          {[
            ["Famílias", summary.familias_total],
            ["Ativas", summary.familias_ativas],
            ["Suspensas", summary.familias_suspensas],
            ["Novas em 30 dias", summary.familias_novas_30_dias],
            ["Usuários", summary.usuarios_total],
            ["Membros ativos", summary.membros_ativos],
            ["Compras", summary.compras_total],
            ["Itens", summary.itens_total],
            ["Produtos", summary.produtos_total],
            ["Supermercados", summary.supermercados_total],
          ].map(([label, value]) => (
            <article key={String(label)} className="admin-metric-card">
              <span>{label}</span>
              <strong>{Number(value).toLocaleString("pt-BR")}</strong>
            </article>
          ))}
        </div>
      )}

      {!loading && tab === "familias" && !familyDetail && (
        <>
          <form className="admin-filter-row" onSubmit={submitFamilySearch}>
            <input
              type="search"
              value={familySearch}
              onChange={(event) => setFamilySearch(event.target.value)}
              placeholder="Buscar família, administrador ou e-mail"
            />
            <select value={familyStatus} onChange={(event) => setFamilyStatus(event.target.value)}>
              <option value="">Todas</option>
              <option value="ativa">Ativas</option>
              <option value="suspensa">Suspensas</option>
              <option value="cancelada">Canceladas</option>
            </select>
            <button className="capture-button" type="submit">Buscar</button>
          </form>
          <p className="admin-list-count">{families?.total ?? 0} famílias encontradas</p>
          <div className="admin-card-list">
            {families?.familias.map((family) => (
              <button key={family.id} type="button" onClick={() => void openFamily(family.id)}>
                <div>
                  <strong>{family.nome}</strong>
                  <small>{family.administrador_nome} · {family.administrador_email || "sem e-mail"}</small>
                  <small>{family.membros_count} membros · {family.compras_count} compras · {family.produtos_count} produtos</small>
                </div>
                <span className={`admin-status admin-status-${family.status}`}>{statusLabel(family.status)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!loading && tab === "familias" && familyDetail && (
        <section className="admin-detail-card">
          <button className="ghost-action" type="button" onClick={() => setFamilyDetail(null)}>← Voltar às famílias</button>
          <div className="admin-detail-heading">
            <div>
              <h3>{familyDetail.familia.nome}</h3>
              <p>{familyDetail.familia.membros_count} membros · {familyDetail.familia.compras_count} compras · {familyDetail.familia.itens_count} itens</p>
              <small>Última atividade: {formatDate(familyDetail.familia.ultima_atividade)}</small>
            </div>
            <span className={`admin-status admin-status-${familyDetail.familia.status}`}>
              {statusLabel(familyDetail.familia.status)}
            </span>
          </div>
          {familyDetail.familia.observacao_admin && <p className="admin-note">{familyDetail.familia.observacao_admin}</p>}
          <div className="button-row admin-actions-row">
            <button type="button" className="ghost-action" disabled={Boolean(busy)} onClick={() => void editFamily()}>Editar</button>
            <button type="button" className="ghost-action" disabled={Boolean(busy)} onClick={() => void toggleFamilyStatus()}>
              {familyDetail.familia.status === "suspensa" ? "Reativar" : "Suspender"}
            </button>
            <button type="button" className="danger-action" disabled={Boolean(busy)} onClick={() => void permanentlyDeleteFamily()}>
              Excluir definitivamente
            </button>
          </div>
          <h3>Membros</h3>
          <div className="admin-member-list">
            {familyDetail.membros.map((member) => (
              <article key={member.usuario_id}>
                <div>
                  <strong>{member.nome}{member.admin_geral ? " · Admin Geral" : ""}</strong>
                  <small>{member.email}</small>
                  <small>{member.papel === "administrador" ? "Administrador" : "Membro"}{member.familia_atual ? " · família atual" : ""}</small>
                </div>
                <div>
                  <button type="button" disabled={Boolean(busy)} onClick={() => void changeMemberRole(member.usuario_id, member.papel)}>Alterar papel</button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => void removeMember(member.usuario_id, member.nome)}>Remover</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && tab === "usuarios" && !userDetail && (
        <>
          <form className="admin-filter-row" onSubmit={submitUserSearch}>
            <input
              type="search"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Buscar nome, e-mail ou família"
            />
            <button className="capture-button" type="submit">Buscar</button>
          </form>
          <p className="admin-list-count">{users?.total ?? 0} usuários encontrados</p>
          <div className="admin-card-list">
            {users?.usuarios.map((user) => (
              <button key={user.id} type="button" onClick={() => void openUser(user.id)}>
                <div>
                  <strong>{user.nome}{user.admin_geral ? " · Admin Geral" : ""}</strong>
                  <small>{user.email}</small>
                  <small>{user.familias_count} famílias · atual: {user.familia_atual_nome}</small>
                </div>
                <span>{formatDate(user.ultima_atividade)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!loading && tab === "usuarios" && userDetail && (
        <section className="admin-detail-card">
          <button className="ghost-action" type="button" onClick={() => setUserDetail(null)}>← Voltar aos usuários</button>
          <div className="admin-detail-heading">
            <div>
              <h3>{userDetail.usuario.nome}</h3>
              <p>{userDetail.usuario.email}</p>
              <small>{userDetail.familias.length} vínculos familiares</small>
            </div>
            {userDetail.usuario.admin_geral && <span className="admin-status admin-status-ativa">Admin Geral</span>}
          </div>
          <div className="button-row admin-actions-row">
            <button type="button" className="ghost-action" disabled={Boolean(busy)} onClick={() => void resetUserPassword()}>Redefinir senha</button>
            <button type="button" className="danger-action" disabled={Boolean(busy) || userDetail.usuario.admin_geral} onClick={() => void permanentlyDeleteUser()}>
              Excluir usuário definitivamente
            </button>
          </div>
          <h3>Famílias</h3>
          <div className="admin-member-list">
            {userDetail.familias.map((family) => (
              <article key={family.familia_id}>
                <div>
                  <strong>{family.familia_nome}</strong>
                  <small>{family.papel === "administrador" ? "Administrador" : "Membro"} · {statusLabel(family.familia_status)}</small>
                </div>
                {family.familia_atual && <span>Atual</span>}
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && tab === "auditoria" && (
        <>
          <form className="admin-filter-row" onSubmit={submitAuditSearch}>
            <input
              type="search"
              value={auditSearch}
              onChange={(event) => setAuditSearch(event.target.value)}
              placeholder="Buscar ação ou descrição"
            />
            <button className="capture-button" type="submit">Buscar</button>
          </form>
          <p className="admin-list-count">{audit?.total ?? 0} ações registradas</p>
          <div className="admin-audit-list">
            {audit?.registros.map((record) => (
              <article key={record.id}>
                <div>
                  <strong>{record.resumo}</strong>
                  <small>{record.acao} · {record.entidade}</small>
                  <small>{record.administrador_nome} · {formatDate(record.criado_em)}</small>
                </div>
                {record.request_id && <span>{record.request_id}</span>}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
