"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  deactivateRegistryCategory,
  fetchRegistries,
  mergeRegistrySupermarkets,
  reactivateRegistryCategory,
  updateRegistryCategory,
  updateRegistrySupermarket,
} from "@/services/cadastros";
import { createCategory } from "@/services/produtos";
import type {
  CadastrosData,
  CategoriaCadastro,
  SupermercadoCadastro,
} from "@/types/cadastros";

type RegistryTab = "categories" | "supermarkets";
type LoadState = "loading" | "ready" | "error";

type Props = {
  apiUrl: string;
  accessToken: string;
  onClose: () => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Sem compras";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return value || "CNPJ não identificado";
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function RegistriesView({ apiUrl, accessToken, onClose }: Props) {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<CadastrosData | null>(null);
  const [tab, setTab] = useState<RegistryTab>("categories");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [deactivatingCategoryId, setDeactivatingCategoryId] = useState("");
  const [categoryDestinationId, setCategoryDestinationId] = useState("");
  const [editingSupermarketId, setEditingSupermarketId] = useState("");
  const [editingSupermarketName, setEditingSupermarketName] = useState("");
  const [mergingSupermarketId, setMergingSupermarketId] = useState("");
  const [supermarketDestinationId, setSupermarketDestinationId] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const result = await fetchRegistries(apiUrl, accessToken);
      setData(result);
      setState("ready");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os cadastros.",
      );
      setState("error");
    }
  }, [accessToken, apiUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeCategories = useMemo(
    () => data?.categorias.filter((category) => category.ativo) ?? [],
    [data],
  );

  const runAction = async (
    actionKey: string,
    action: () => Promise<{ mensagem: string }>,
  ) => {
    setBusy(actionKey);
    setError("");
    setMessage("");
    try {
      const result = await action();
      setMessage(result.mensagem);
      await load();
      return true;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível concluir a ação.",
      );
      return false;
    } finally {
      setBusy("");
    }
  };

  const submitNewCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newCategory.trim();
    if (name.length < 2) return;
    const success = await runAction("new-category", () =>
      createCategory(apiUrl, accessToken, name),
    );
    if (success) setNewCategory("");
  };

  const submitCategoryName = async (
    event: FormEvent<HTMLFormElement>,
    category: CategoriaCadastro,
  ) => {
    event.preventDefault();
    const name = editingCategoryName.trim();
    if (name.length < 2 || name === category.nome) return;
    const success = await runAction(`category-${category.id}`, () =>
      updateRegistryCategory(apiUrl, accessToken, category.id, name),
    );
    if (success) setEditingCategoryId("");
  };

  const submitCategoryDeactivation = async (
    event: FormEvent<HTMLFormElement>,
    category: CategoriaCadastro,
  ) => {
    event.preventDefault();
    if (!categoryDestinationId) return;
    const destination = activeCategories.find(
      (item) => item.id === categoryDestinationId,
    );
    if (
      !window.confirm(
        `Desativar ${category.nome} e mover ${category.produtos_count} produto(s) para ${destination?.nome ?? "a categoria escolhida"}?`,
      )
    ) {
      return;
    }
    const success = await runAction(`deactivate-${category.id}`, () =>
      deactivateRegistryCategory(
        apiUrl,
        accessToken,
        category.id,
        categoryDestinationId,
      ),
    );
    if (success) {
      setDeactivatingCategoryId("");
      setCategoryDestinationId("");
    }
  };

  const submitSupermarketName = async (
    event: FormEvent<HTMLFormElement>,
    supermarket: SupermercadoCadastro,
  ) => {
    event.preventDefault();
    const name = editingSupermarketName.trim();
    if (name.length < 2 || name === supermarket.nome) return;
    const success = await runAction(`supermarket-${supermarket.id}`, () =>
      updateRegistrySupermarket(apiUrl, accessToken, supermarket.id, name),
    );
    if (success) setEditingSupermarketId("");
  };

  const eligibleMergeTargets = (source: SupermercadoCadastro) => {
    if (!source.cnpj) return [];
    return (data?.supermercados ?? []).filter(
      (target) =>
        target.id !== source.id &&
        target.ativo &&
        (!target.cnpj || target.cnpj === source.cnpj),
    );
  };

  const submitSupermarketMerge = async (
    event: FormEvent<HTMLFormElement>,
    source: SupermercadoCadastro,
  ) => {
    event.preventDefault();
    if (!supermarketDestinationId) return;
    const target = data?.supermercados.find(
      (item) => item.id === supermarketDestinationId,
    );
    if (
      !window.confirm(
        `Unir ${source.nome} ao cadastro ${target?.nome ?? "selecionado"}? As compras e o histórico serão preservados.`,
      )
    ) {
      return;
    }
    const success = await runAction(`merge-${source.id}`, () =>
      mergeRegistrySupermarkets(
        apiUrl,
        accessToken,
        source.id,
        supermarketDestinationId,
      ),
    );
    if (success) {
      setMergingSupermarketId("");
      setSupermarketDestinationId("");
    }
  };

  if (state === "loading" && !data) {
    return (
      <section className="processing-card" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Carregando cadastros</strong>
          <p>Preparando categorias e supermercados…</p>
        </div>
      </section>
    );
  }

  if (state === "error" && !data) {
    return (
      <section className="feedback-card error-card" role="alert">
        <strong>Não foi possível abrir os cadastros</strong>
        <p>{error}</p>
        <button className="capture-button" type="button" onClick={() => void load()}>
          Tentar novamente
        </button>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="registries-section">
      <div className="settings-title-row">
        <div>
          <p className="eyebrow">Cadastros</p>
          <h2>Categorias e supermercados</h2>
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

      <div className="registry-tabs" role="tablist" aria-label="Tipos de cadastro">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "categories"}
          className={tab === "categories" ? "active" : ""}
          onClick={() => setTab("categories")}
        >
          Categorias
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "supermarkets"}
          className={tab === "supermarkets" ? "active" : ""}
          onClick={() => setTab("supermarkets")}
        >
          Supermercados
        </button>
      </div>

      {tab === "categories" && (
        <>
          <div className="registry-kpi-grid">
            <article>
              <span>Ativas</span>
              <strong>{data.resumo.categorias_ativas}</strong>
            </article>
            <article>
              <span>Personalizadas</span>
              <strong>{data.resumo.categorias_personalizadas}</strong>
            </article>
            <article>
              <span>Produtos classificados</span>
              <strong>{data.resumo.produtos_classificados}</strong>
            </article>
          </div>

          {data.pode_editar && (
            <form className="registry-create-card" onSubmit={submitNewCategory}>
              <label>
                Nova categoria personalizada
                <input
                  type="text"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  placeholder="Ex.: Congelados"
                  required
                />
              </label>
              <button
                className="capture-button"
                type="submit"
                disabled={busy === "new-category"}
              >
                {busy === "new-category" ? "Criando…" : "Criar categoria"}
              </button>
            </form>
          )}

          <div className="registry-list">
            {data.categorias.map((category) => (
              <article
                className={`registry-card ${!category.ativo ? "registry-card-inactive" : ""}`}
                key={category.id}
              >
                <div className="registry-card-heading">
                  <div>
                    <strong>{category.nome}</strong>
                    <span>
                      {category.sistema ? "Categoria do sistema" : "Personalizada"} · {category.produtos_count} produto(s)
                    </span>
                  </div>
                  <small>{category.ativo ? "Ativa" : "Desativada"}</small>
                </div>

                {data.pode_editar && !category.sistema && category.ativo && (
                  <div className="registry-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setEditingCategoryName(category.nome);
                        setDeactivatingCategoryId("");
                      }}
                    >
                      Editar nome
                    </button>
                    <button
                      className="danger-text-button"
                      type="button"
                      onClick={() => {
                        setDeactivatingCategoryId(category.id);
                        setCategoryDestinationId("");
                        setEditingCategoryId("");
                      }}
                    >
                      Desativar
                    </button>
                  </div>
                )}

                {data.pode_editar && !category.sistema && !category.ativo && (
                  <button
                    className="registry-reactivate-button"
                    type="button"
                    disabled={busy === `reactivate-${category.id}`}
                    onClick={() =>
                      void runAction(`reactivate-${category.id}`, () =>
                        reactivateRegistryCategory(apiUrl, accessToken, category.id),
                      )
                    }
                  >
                    {busy === `reactivate-${category.id}` ? "Reativando…" : "Reativar categoria"}
                  </button>
                )}

                {editingCategoryId === category.id && (
                  <form
                    className="registry-inline-form"
                    onSubmit={(event) => submitCategoryName(event, category)}
                  >
                    <label>
                      Nome da categoria
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(event) => setEditingCategoryName(event.target.value)}
                        minLength={2}
                        maxLength={80}
                        required
                      />
                    </label>
                    <div className="registry-inline-actions">
                      <button type="button" onClick={() => setEditingCategoryId("")}>
                        Cancelar
                      </button>
                      <button
                        className="capture-button"
                        type="submit"
                        disabled={busy === `category-${category.id}`}
                      >
                        {busy === `category-${category.id}` ? "Salvando…" : "Salvar"}
                      </button>
                    </div>
                  </form>
                )}

                {deactivatingCategoryId === category.id && (
                  <form
                    className="registry-inline-form registry-warning-form"
                    onSubmit={(event) => submitCategoryDeactivation(event, category)}
                  >
                    <p>
                      Escolha para onde os {category.produtos_count} produto(s) serão movidos.
                    </p>
                    <label>
                      Categoria de destino
                      <select
                        value={categoryDestinationId}
                        onChange={(event) => setCategoryDestinationId(event.target.value)}
                        required
                      >
                        <option value="">Selecione</option>
                        {activeCategories
                          .filter((item) => item.id !== category.id)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.nome}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="registry-inline-actions">
                      <button type="button" onClick={() => setDeactivatingCategoryId("")}>
                        Cancelar
                      </button>
                      <button
                        className="danger-action-button"
                        type="submit"
                        disabled={!categoryDestinationId || busy === `deactivate-${category.id}`}
                      >
                        {busy === `deactivate-${category.id}` ? "Desativando…" : "Mover e desativar"}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "supermarkets" && (
        <>
          <div className="registry-kpi-grid registry-kpi-two">
            <article>
              <span>Supermercados</span>
              <strong>{data.resumo.supermercados_ativos}</strong>
            </article>
            <article>
              <span>Compras identificadas</span>
              <strong>{data.resumo.compras_com_supermercado}</strong>
            </article>
          </div>

          <section className="registry-info-card">
            <strong>Correção e união de cadastros</strong>
            <p>
              Corrija nomes livremente. A união automática só aparece quando o CNPJ permite preservar futuras leituras da NFC-e com segurança.
            </p>
          </section>

          <div className="registry-list">
            {data.supermercados.length === 0 && (
              <section className="products-empty-card">
                <div aria-hidden="true">🛒</div>
                <strong>Nenhum supermercado cadastrado</strong>
                <p>Os supermercados aparecem automaticamente após salvar uma NFC-e.</p>
              </section>
            )}

            {data.supermercados.map((supermarket) => {
              const targets = eligibleMergeTargets(supermarket);
              return (
                <article className="registry-card" key={supermarket.id}>
                  <div className="registry-card-heading">
                    <div>
                      <strong>{supermarket.nome}</strong>
                      <span>{formatCnpj(supermarket.cnpj)}</span>
                    </div>
                    <small>{supermarket.compras_count} compra(s)</small>
                  </div>

                  <div className="registry-supermarket-stats">
                    <span>
                      <small>Total registrado</small>
                      <strong>{formatCurrency(supermarket.valor_total)}</strong>
                    </span>
                    <span>
                      <small>Última compra</small>
                      <strong>{formatDate(supermarket.ultima_compra)}</strong>
                    </span>
                  </div>

                  {data.pode_editar && (
                    <div className="registry-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSupermarketId(supermarket.id);
                          setEditingSupermarketName(supermarket.nome);
                          setMergingSupermarketId("");
                        }}
                      >
                        Editar nome
                      </button>
                      {targets.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setMergingSupermarketId(supermarket.id);
                            setSupermarketDestinationId("");
                            setEditingSupermarketId("");
                          }}
                        >
                          Unir cadastro
                        </button>
                      )}
                    </div>
                  )}

                  {editingSupermarketId === supermarket.id && (
                    <form
                      className="registry-inline-form"
                      onSubmit={(event) => submitSupermarketName(event, supermarket)}
                    >
                      <label>
                        Nome exibido
                        <input
                          type="text"
                          value={editingSupermarketName}
                          onChange={(event) => setEditingSupermarketName(event.target.value)}
                          minLength={2}
                          maxLength={160}
                          required
                        />
                      </label>
                      <div className="registry-inline-actions">
                        <button type="button" onClick={() => setEditingSupermarketId("")}>
                          Cancelar
                        </button>
                        <button
                          className="capture-button"
                          type="submit"
                          disabled={busy === `supermarket-${supermarket.id}`}
                        >
                          {busy === `supermarket-${supermarket.id}` ? "Salvando…" : "Salvar"}
                        </button>
                      </div>
                    </form>
                  )}

                  {mergingSupermarketId === supermarket.id && (
                    <form
                      className="registry-inline-form registry-warning-form"
                      onSubmit={(event) => submitSupermarketMerge(event, supermarket)}
                    >
                      <p>
                        Todas as compras e registros de preço serão movidos para o cadastro escolhido.
                      </p>
                      <label>
                        Cadastro principal
                        <select
                          value={supermarketDestinationId}
                          onChange={(event) => setSupermarketDestinationId(event.target.value)}
                          required
                        >
                          <option value="">Selecione</option>
                          {targets.map((target) => (
                            <option key={target.id} value={target.id}>
                              {target.nome} · {formatCnpj(target.cnpj)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="registry-inline-actions">
                        <button type="button" onClick={() => setMergingSupermarketId("")}>
                          Cancelar
                        </button>
                        <button
                          className="danger-action-button"
                          type="submit"
                          disabled={!supermarketDestinationId || busy === `merge-${supermarket.id}`}
                        >
                          {busy === `merge-${supermarket.id}` ? "Unindo…" : "Confirmar união"}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
