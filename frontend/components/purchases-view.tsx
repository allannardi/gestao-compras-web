"use client";

import { useEffect, useState } from "react";

import {
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

function itemLabel(value: number): string {
  return value === 1 ? "1 item" : `${value} itens`;
}

export function PurchasesView({
  apiUrl,
  accessToken,
  refreshKey,
  onAddPurchase,
}: Props) {
  const [purchases, setPurchases] = useState<CompraResumo[]>([]);
  const [listState, setListState] = useState<LoadState>("loading");
  const [listError, setListError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompraDetalhe | null>(null);
  const [detailState, setDetailState] = useState<LoadState>("ready");
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetchPurchases(
      apiUrl,
      accessToken,
      0,
      PAGE_SIZE,
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
  }, [accessToken, apiUrl, refreshKey, reloadKey]);

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
              </div>
              <span>{itemLabel(detail.itens.length)}</span>
            </div>

            {detail.itens.length > 0 ? (
              <div className="items-list">
                {detail.itens.map((item) => (
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
          onClick={() => {
            setListState("loading");
            setListError("");
            setReloadKey((value) => value + 1);
          }}
          disabled={listState === "loading"}
        >
          Atualizar
        </button>
      </div>

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
            onClick={() => {
              setListState("loading");
              setListError("");
              setReloadKey((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        </section>
      )}

      {listState === "ready" && purchases.length === 0 && (
        <section className="purchases-empty-card">
          <div className="purchases-empty-icon" aria-hidden="true">🧾</div>
          <strong>Nenhuma compra registrada</strong>
          <p>Leia a primeira NFC-e para começar o histórico da sua família.</p>
          <button className="capture-button" type="button" onClick={onAddPurchase}>
            Adicionar primeira compra
          </button>
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
