"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  deleteTestPurchase,
  fetchPurchaseDetail,
  fetchPurchases,
} from "@/services/compras";
import type {
  CompraDetalhe,
  CompraResumo,
} from "@/types/compras";

type Props = {
  apiUrl: string;
  accessToken: string;
  refreshKey: number;
  canDeletePurchases: boolean;
  onAddPurchase: () => void;
};

type LoadState = "loading" | "ready" | "error";

const PAGE_SIZE = 20;

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value || "—";

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(year, month - 1, day),
  );
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function itemLabel(value: number): string {
  return value === 1 ? "1 item" : `${value} itens`;
}

function compareItemsByTotal<T extends { valor_total: number; descricao_original: string }>(
  first: T,
  second: T,
): number {
  const totalDifference = second.valor_total - first.valor_total;
  if (totalDifference !== 0) return totalDifference;

  return first.descricao_original.localeCompare(second.descricao_original, "pt-BR");
}

export function PurchasesView({
  apiUrl,
  accessToken,
  refreshKey,
  canDeletePurchases,
  onAddPurchase,
}: Props) {
  const [purchases, setPurchases] = useState<CompraResumo[]>([]);
  const [listState, setListState] = useState<LoadState>("loading");
  const [listError, setListError] = useState("");
  const [listMessage, setListMessage] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchDraft, setSearchDraft] = useState("");
  const [monthDraft, setMonthDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedMonth, setAppliedMonth] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompraDetalhe | null>(null);
  const [detailState, setDetailState] = useState<LoadState>("ready");
  const [detailError, setDetailError] = useState("");

  const [deleteExpanded, setDeleteExpanded] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const filtersActive = Boolean(appliedSearch || appliedMonth);
  const sortedDetailItems = detail
    ? [...detail.itens].sort(compareItemsByTotal)
    : [];

  useEffect(() => {
    const controller = new AbortController();

    void fetchPurchases(
      apiUrl,
      accessToken,
      0,
      PAGE_SIZE,
      appliedSearch,
      appliedMonth,
      controller.signal,
    )
      .then((result) => {
        setPurchases(result.compras);
        setHasMore(result.tem_mais);
        setNextOffset(result.proximo_offset);
        setListState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setListError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as compras.",
        );
        setListState("error");
      });

    return () => controller.abort();
  }, [
    accessToken,
    apiUrl,
    appliedMonth,
    appliedSearch,
    refreshKey,
    reloadKey,
  ]);

  const reloadList = () => {
    setListState("loading");
    setListError("");
    setReloadKey((value) => value + 1);
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = searchDraft.trim();

    setListMessage("");
    setListState("loading");
    setListError("");
    setAppliedSearch(nextSearch);
    setAppliedMonth(monthDraft);

    if (nextSearch === appliedSearch && monthDraft === appliedMonth) {
      reloadList();
    }
  };

  const clearFilters = () => {
    setSearchDraft("");
    setMonthDraft("");
    setListState("loading");
    setListError("");
    setAppliedSearch("");
    setAppliedMonth("");
    setListMessage("");

    if (!filtersActive) {
      reloadList();
    }
  };

  const loadMore = async () => {
    if (loadingMore || nextOffset === null) return;

    setLoadingMore(true);
    setListError("");

    try {
      const result = await fetchPurchases(
        apiUrl,
        accessToken,
        nextOffset,
        PAGE_SIZE,
        appliedSearch,
        appliedMonth,
      );

      setPurchases((current) => {
        const knownIds = new Set(current.map((purchase) => purchase.id));
        return [
          ...current,
          ...result.compras.filter((purchase) => !knownIds.has(purchase.id)),
        ];
      });
      setHasMore(result.tem_mais);
      setNextOffset(result.proximo_offset);
    } catch (error) {
      setListError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar mais compras.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetail = async (purchaseId: string) => {
    setSelectedId(purchaseId);
    setDetail(null);
    setDetailError("");
    setDetailState("loading");
    setDeleteExpanded(false);
    setDeleteConfirmation("");
    setDeleteError("");

    try {
      const result = await fetchPurchaseDetail(
        apiUrl,
        accessToken,
        purchaseId,
      );
      setDetail(result);
      setDetailState("ready");
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a compra.",
      );
      setDetailState("error");
    }
  };

  const deletePurchase = async () => {
    if (!selectedId || deleting || deleteConfirmation !== "EXCLUIR") return;

    setDeleting(true);
    setDeleteError("");

    try {
      const result = await deleteTestPurchase(
        apiUrl,
        accessToken,
        selectedId,
        deleteConfirmation,
      );

      setPurchases((current) =>
        current.filter((purchase) => purchase.id !== selectedId),
      );
      setSelectedId(null);
      setDetail(null);
      setDeleteExpanded(false);
      setDeleteConfirmation("");
      setListState("ready");
      setListMessage(
        `${result.mensagem} ${result.itens_excluidos} itens e ${result.historicos_excluidos} registros de preço foram removidos.`,
      );
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a compra de teste.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (selectedId) {
    return (
      <section className="purchase-detail-stack" aria-label="Detalhes da compra">
        <button
          className="back-purchases-button"
          type="button"
          onClick={() => {
            setSelectedId(null);
            setDetail(null);
            setDetailError("");
            setDeleteExpanded(false);
            setDeleteConfirmation("");
            setDeleteError("");
          }}
        >
          <span aria-hidden="true">‹</span>
          Voltar para compras
        </button>

        {detailState === "loading" && (
          <section className="processing-card" role="status">
            <span className="spinner" aria-hidden="true" />
            <div>
              <strong>Abrindo a compra</strong>
              <p>Carregando mercado, valores e itens…</p>
            </div>
          </section>
        )}

        {detailState === "error" && (
          <section className="feedback-card error-card" role="alert">
            <strong>Não foi possível abrir a compra</strong>
            <p>{detailError}</p>
            <button
              className="capture-button retry-detail-button"
              type="button"
              onClick={() => void openDetail(selectedId)}
            >
              Tentar novamente
            </button>
          </section>
        )}

        {detailState === "ready" && detail && (
          <>
            <article className="purchase-detail-summary">
              <div className="purchase-detail-heading">
                <div>
                  <span>Supermercado</span>
                  <h2>{detail.supermercado_nome}</h2>
                  {detail.supermercado_cnpj && (
                    <small>CNPJ {detail.supermercado_cnpj}</small>
                  )}
                </div>
                <strong>{moneyFormatter.format(detail.valor_total)}</strong>
              </div>

              <div className="purchase-detail-meta">
                <span>
                  <small>Data</small>
                  {formatDate(detail.data_compra)}
                </span>
                <span>
                  <small>Pagamento</small>
                  {detail.forma_pagamento || "Não identificado"}
                </span>
                <span>
                  <small>Itens</small>
                  {itemLabel(detail.itens.length)}
                </span>
                <span>
                  <small>Status</small>
                  {detail.status === "confirmada" ? "Confirmada" : "Cancelada"}
                </span>
              </div>

              {detail.chave_nfce && (
                <details className="nfce-key-details">
                  <summary>Dados da NFC-e</summary>
                  <span>Chave: {detail.chave_nfce}</span>
                </details>
              )}
            </article>

            <div className="items-header purchase-items-header">
              <div>
                <p className="eyebrow">Detalhes</p>
                <h2>Itens da compra</h2>
                <small>Ordenados do maior para o menor valor total</small>
              </div>
              <span>{itemLabel(detail.itens.length)}</span>
            </div>

            {sortedDetailItems.length > 0 ? (
              <div className="items-list">
                {sortedDetailItems.map((item) => (
                  <article className="item-card purchase-detail-item" key={item.id}>
                    <strong>{item.descricao_original}</strong>
                    <div className="item-metrics">
                      <span>
                        <small>Qtd</small>
                        {numberFormatter.format(item.quantidade)}
                      </span>
                      <span>
                        <small>Un</small>
                        {item.unidade}
                      </span>
                      <span>
                        <small>Valor unit.</small>
                        {moneyFormatter.format(item.valor_unitario)}
                      </span>
                      <span className="item-total">
                        <small>Total</small>
                        {moneyFormatter.format(item.valor_total)}
                      </span>
                    </div>
                    <div className="item-category-row">
                      <span>Categoria</span>
                      <strong>{item.categoria_nome}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-card">Esta compra não possui itens registrados.</div>
            )}

            {canDeletePurchases && (
              <section className="delete-purchase-card">
                {!deleteExpanded ? (
                  <>
                    <div>
                      <strong>Compra de teste?</strong>
                      <span>
                        Administradores podem excluir a compra, seus itens e o histórico de preços relacionado.
                      </span>
                    </div>
                    <button
                      className="delete-outline-button"
                      type="button"
                      onClick={() => setDeleteExpanded(true)}
                    >
                      Excluir compra de teste
                    </button>
                  </>
                ) : (
                  <div className="delete-confirmation-stack">
                    <div>
                      <strong>Confirmação obrigatória</strong>
                      <span>
                        Produtos, categorias e supermercado permanecerão cadastrados. Digite <b>EXCLUIR</b> para remover esta compra.
                      </span>
                    </div>
                    <label>
                      Confirmação
                      <input
                        type="text"
                        value={deleteConfirmation}
                        onChange={(event) =>
                          setDeleteConfirmation(event.target.value.toUpperCase())
                        }
                        autoComplete="off"
                        maxLength={20}
                        placeholder="EXCLUIR"
                      />
                    </label>
                    {deleteError && <p className="inline-error">{deleteError}</p>}
                    <div className="delete-button-row">
                      <button
                        className="ghost-action"
                        type="button"
                        disabled={deleting}
                        onClick={() => {
                          setDeleteExpanded(false);
                          setDeleteConfirmation("");
                          setDeleteError("");
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        className="delete-danger-button"
                        type="button"
                        disabled={deleting || deleteConfirmation !== "EXCLUIR"}
                        onClick={() => void deletePurchase()}
                      >
                        {deleting ? "Excluindo…" : "Excluir definitivamente"}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <section className="purchases-section" aria-label="Compras da família">
      <div className="purchases-heading">
        <div>
          <p className="eyebrow">Histórico</p>
          <h2>Compras registradas</h2>
        </div>
        <button
          type="button"
          onClick={reloadList}
          disabled={listState === "loading"}
        >
          Atualizar
        </button>
      </div>

      <form className="purchase-filters-card" onSubmit={applyFilters}>
        <label className="purchase-search-field">
          Buscar supermercado
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            maxLength={80}
            placeholder="Ex.: Carrefour"
          />
        </label>
        <label>
          Mês da compra
          <input
            type="month"
            value={monthDraft}
            onChange={(event) => setMonthDraft(event.target.value)}
          />
        </label>
        <div className="purchase-filter-actions">
          <button className="ghost-action" type="button" onClick={clearFilters}>
            Limpar
          </button>
          <button className="capture-button" type="submit">
            Filtrar
          </button>
        </div>
        {filtersActive && (
          <div className="active-filter-summary" aria-live="polite">
            <span>Filtros ativos</span>
            {appliedSearch && <strong>Mercado: {appliedSearch}</strong>}
            {appliedMonth && <strong>Mês: {formatMonth(appliedMonth)}</strong>}
          </div>
        )}
      </form>

      {listMessage && (
        <section className="feedback-card success-card purchases-success" role="status">
          <strong>Histórico atualizado</strong>
          <p>{listMessage}</p>
        </section>
      )}

      {listState === "loading" && (
        <section className="processing-card" role="status">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>Carregando compras</strong>
            <p>Buscando o histórico da sua família…</p>
          </div>
        </section>
      )}

      {listState === "error" && (
        <section className="feedback-card error-card" role="alert">
          <strong>Não foi possível carregar as compras</strong>
          <p>{listError}</p>
          <button
            className="capture-button retry-detail-button"
            type="button"
            onClick={reloadList}
          >
            Tentar novamente
          </button>
        </section>
      )}

      {listState === "ready" && purchases.length === 0 && (
        <section className="purchases-empty-card">
          <div className="purchases-empty-icon" aria-hidden="true">🧾</div>
          <strong>
            {filtersActive ? "Nenhuma compra encontrada" : "Nenhuma compra registrada"}
          </strong>
          <p>
            {filtersActive
              ? "Altere ou limpe os filtros para consultar outras compras."
              : "Leia a primeira NFC-e para começar o histórico da sua família."}
          </p>
          {filtersActive ? (
            <button className="capture-button" type="button" onClick={clearFilters}>
              Limpar filtros
            </button>
          ) : (
            <button className="capture-button" type="button" onClick={onAddPurchase}>
              Adicionar primeira compra
            </button>
          )}
        </section>
      )}

      {listState === "ready" && purchases.length > 0 && (
        <>
          <div className="purchase-list">
            {purchases.map((purchase) => (
              <article className="purchase-card" key={purchase.id}>
                <div className="purchase-card-topline">
                  <div>
                    <span>{formatDate(purchase.data_compra)}</span>
                    <strong>{purchase.supermercado_nome}</strong>
                  </div>
                  <strong>{moneyFormatter.format(purchase.valor_total)}</strong>
                </div>

                <div className="purchase-card-meta">
                  <span>{itemLabel(purchase.itens_count)}</span>
                  <span>{purchase.forma_pagamento || "Pagamento não identificado"}</span>
                </div>

                <button
                  type="button"
                  onClick={() => void openDetail(purchase.id)}
                >
                  Ver detalhes
                  <span aria-hidden="true">›</span>
                </button>
              </article>
            ))}
          </div>

          {listError && (
            <p className="inline-error purchases-inline-error">{listError}</p>
          )}

          {hasMore && nextOffset !== null && (
            <button
              className="secondary-action full-width load-more-button"
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? "Carregando…" : "Carregar mais compras"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
