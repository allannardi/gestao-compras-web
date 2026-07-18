"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { MonthSelect } from "@/components/month-select";
import {
  fetchDashboard,
  fetchProductPriceHistory,
  searchHistoryProducts,
} from "@/services/dashboard";
import type {
  DashboardData,
  HistoricoPrecoPonto,
  HistoricoProdutoData,
  HistoricoProdutoOpcao,
} from "@/types/dashboard";

type Props = {
  apiUrl: string;
  accessToken: string;
  onAddPurchase: () => void;
};

type LoadState = "loading" | "ready" | "error";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(value: string): string {
  const [year, month] = value.slice(0, 7).split("-").map(Number);
  if (!year || !month) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function formatDate(value: string | null): string {
  if (!value) return "Sem registro";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

function historyProductOptionLabel(product: HistoricoProdutoOpcao): string {
  const value =
    product.ultimo_valor_unitario === null
      ? "Sem valor"
      : moneyFormatter.format(product.ultimo_valor_unitario);
  const records = `${product.registros_count} ${
    product.registros_count === 1 ? "registro" : "registros"
  }`;

  return [
    product.nome,
    value,
    records,
    product.categoria_nome || "Não classificado",
  ].join(" · ");
}

function variationCopy(value: number | null, previousTotal: number): string {
  if (value === null) {
    return previousTotal === 0
      ? "Primeiro mês com gastos registrados"
      : "Sem base suficiente para comparação";
  }
  if (value === 0) return "Mesmo total do mês anterior";
  return `${Math.abs(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}% ${value > 0 ? "acima" : "abaixo"} do mês anterior`;
}

function PriceLineChart({ points }: { points: HistoricoPrecoPonto[] }) {
  const chart = useMemo(() => {
    const width = 600;
    const height = 220;
    const paddingX = 42;
    const paddingY = 28;
    const values = points.map((point) => point.valor_unitario);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, Math.max(max * 0.08, 0.01));

    const coordinates = points.map((point, index) => {
      const x =
        points.length === 1
          ? width / 2
          : paddingX +
            (index / (points.length - 1)) * (width - paddingX * 2);
      const y =
        paddingY +
        ((max - point.valor_unitario + range * 0.08) /
          (range * 1.16)) *
          (height - paddingY * 2);
      return { x, y, point };
    });

    return {
      width,
      height,
      min,
      max,
      coordinates,
      polyline: coordinates.map(({ x, y }) => `${x},${y}`).join(" "),
    };
  }, [points]);

  if (points.length === 0) return null;

  return (
    <div className="price-chart-shell">
      <svg
        className="price-line-chart"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label="Evolução do valor unitário do produto"
      >
        <line x1="42" y1="192" x2="558" y2="192" className="chart-axis" />
        <line x1="42" y1="28" x2="42" y2="192" className="chart-axis" />
        {chart.coordinates.length > 1 && (
          <polyline points={chart.polyline} className="chart-line" />
        )}
        {chart.coordinates.map(({ x, y, point }) => (
          <g key={point.id}>
            <circle cx={x} cy={y} r="6" className="chart-point" />
            <title>
              {`${formatDate(point.data_compra)} · ${moneyFormatter.format(point.valor_unitario)} · ${point.supermercado_nome}`}
            </title>
          </g>
        ))}
        <text x="45" y="21" className="chart-label">
          {moneyFormatter.format(chart.max)}
        </text>
        <text x="45" y="215" className="chart-label">
          {moneyFormatter.format(chart.min)}
        </text>
      </svg>
      <div className="price-chart-range">
        <span>{formatDate(points[0].data_compra)}</span>
        <span>{formatDate(points[points.length - 1].data_compra)}</span>
      </div>
    </div>
  );
}

function RankingList({
  title,
  emptyCopy,
  rows,
}: {
  title: string;
  emptyCopy: string;
  rows: Array<{
    id: string;
    name: string;
    value: number;
    detail: string;
  }>;
}) {
  const maximum = Math.max(...rows.map((row) => row.value), 0);

  return (
    <section className="dashboard-ranking-card">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p>{emptyCopy}</p>
      ) : (
        <div className="dashboard-ranking-list">
          {rows.map((row, index) => (
            <article key={row.id}>
              <div className="ranking-heading">
                <span>{index + 1}</span>
                <div>
                  <strong>{row.name}</strong>
                  <small>{row.detail}</small>
                </div>
                <b>{moneyFormatter.format(row.value)}</b>
              </div>
              <div className="ranking-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${maximum > 0 ? Math.max((row.value / maximum) * 100, 4) : 0}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function DashboardView({ apiUrl, accessToken, onAddPurchase }: Props) {
  const initialMonth = currentMonth();
  const [monthDraft, setMonthDraft] = useState(initialMonth);
  const [appliedMonth, setAppliedMonth] = useState(initialMonth);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardState, setDashboardState] = useState<LoadState>("loading");
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardReload, setDashboardReload] = useState(0);

  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [productResults, setProductResults] = useState<HistoricoProdutoOpcao[]>([]);
  const [productsState, setProductsState] = useState<LoadState>("loading");
  const [productsError, setProductsError] = useState("");
  const [productsReload, setProductsReload] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState<HistoricoProdutoOpcao | null>(null);
  const [history, setHistory] = useState<HistoricoProdutoData | null>(null);
  const [historyState, setHistoryState] = useState<LoadState>("ready");
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetchDashboard(
      apiUrl,
      accessToken,
      appliedMonth,
      controller.signal,
    )
      .then((result) => {
        setDashboard(result);
        setDashboardState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDashboardError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o dashboard.",
        );
        setDashboardState("error");
      });

    return () => controller.abort();
  }, [accessToken, apiUrl, appliedMonth, dashboardReload]);

  useEffect(() => {
    const controller = new AbortController();
    void searchHistoryProducts(
      apiUrl,
      accessToken,
      appliedSearch,
      controller.signal,
    )
      .then((result) => {
        setProductResults(result);
        setProductsState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProductsError(
          error instanceof Error
            ? error.message
            : "Não foi possível buscar produtos.",
        );
        setProductsState("error");
      });

    return () => controller.abort();
  }, [accessToken, apiUrl, appliedSearch, productsReload]);

  const applyMonth = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDashboardState("loading");
    setDashboardError("");
    if (monthDraft === appliedMonth) {
      setDashboardReload((value) => value + 1);
      return;
    }
    setAppliedMonth(monthDraft);
  };

  const searchProducts = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProductsState("loading");
    setProductsError("");
    setSelectedProduct(null);
    setHistory(null);
    setHistoryError("");
    setHistoryState("ready");
    const normalizedSearch = searchDraft.trim();
    if (normalizedSearch === appliedSearch) {
      setProductsReload((value) => value + 1);
      return;
    }
    setAppliedSearch(normalizedSearch);
  };

  const openHistory = async (product: HistoricoProdutoOpcao) => {
    setSelectedProduct(product);
    setHistory(null);
    setHistoryError("");
    setHistoryState("loading");

    try {
      const result = await fetchProductPriceHistory(
        apiUrl,
        accessToken,
        product.id,
      );
      setHistory(result);
      setHistoryState("ready");
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o histórico do produto.",
      );
      setHistoryState("error");
    }
  };

  const selectHistoryProduct = (productId: string) => {
    if (!productId) {
      setSelectedProduct(null);
      setHistory(null);
      setHistoryError("");
      setHistoryState("ready");
      return;
    }

    const product = productResults.find((item) => item.id === productId);
    if (product) {
      void openHistory(product);
    }
  };

  return (
    <section className="dashboard-section" aria-label="Dashboard da família">
      <form className="dashboard-month-card" onSubmit={applyMonth}>
        <label>
          Mês do resumo
          <MonthSelect
            value={monthDraft}
            onChange={setMonthDraft}
            required
            ariaLabel="Mês do resumo"
          />
        </label>
        <button className="capture-button" type="submit">
          Atualizar resumo
        </button>
      </form>

      {dashboardState === "loading" && (
        <section className="processing-card" role="status">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>Calculando o mês</strong>
            <p>Somando compras, itens e principais gastos…</p>
          </div>
        </section>
      )}

      {dashboardState === "error" && (
        <section className="feedback-card error-card" role="alert">
          <strong>Não foi possível carregar o resumo</strong>
          <p>{dashboardError}</p>
          <button
            className="capture-button retry-detail-button"
            type="button"
            onClick={() => {
              setDashboardState("loading");
              setDashboardError("");
              setDashboardReload((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        </section>
      )}

      {dashboardState === "ready" && dashboard && (
        <>
          <div className="dashboard-title-row">
            <div>
              <p className="eyebrow">Resumo mensal</p>
              <h2>{formatMonth(dashboard.mes)}</h2>
            </div>
            <span>{dashboard.resumo.compras_count} compras</span>
          </div>

          <div className="dashboard-kpi-grid">
            <article className="dashboard-main-kpi">
              <span>Total gasto</span>
              <strong>{moneyFormatter.format(dashboard.resumo.valor_total)}</strong>
              <small>
                {variationCopy(
                  dashboard.resumo.variacao_percentual,
                  dashboard.resumo.valor_mes_anterior,
                )}
              </small>
            </article>
            <article>
              <span>Ticket médio</span>
              <strong>{moneyFormatter.format(dashboard.resumo.ticket_medio)}</strong>
            </article>
            <article>
              <span>Itens registrados</span>
              <strong>{dashboard.resumo.itens_count.toLocaleString("pt-BR")}</strong>
            </article>
            <article>
              <span>Mês anterior</span>
              <strong>
                {moneyFormatter.format(dashboard.resumo.valor_mes_anterior)}
              </strong>
            </article>
          </div>

          {dashboard.resumo.compras_count === 0 ? (
            <section className="dashboard-empty-card">
              <div aria-hidden="true">📊</div>
              <strong>Sem compras neste mês</strong>
              <p>Registre uma compra ou escolha outro mês para consultar.</p>
              <button className="capture-button" type="button" onClick={onAddPurchase}>
                Adicionar compra
              </button>
            </section>
          ) : (
            <div className="dashboard-rankings-grid">
              <RankingList
                title="Top produtos"
                emptyCopy="Nenhum produto encontrado neste mês."
                rows={dashboard.top_produtos.map((item) => ({
                  id: item.id,
                  name: item.marca ? `${item.nome} · ${item.marca}` : item.nome,
                  value: item.valor_total,
                  detail: `${quantityFormatter.format(item.quantidade)} ${item.unidade_padrao} · ${item.compras_count} compras`,
                }))}
              />
              <RankingList
                title="Gastos por categoria"
                emptyCopy="Nenhuma categoria encontrada neste mês."
                rows={dashboard.top_categorias.map((item) => ({
                  id: item.id,
                  name: item.nome,
                  value: item.valor_total,
                  detail: `${item.produtos_count} produtos · ${item.compras_count} compras`,
                }))}
              />
              <RankingList
                title="Gastos por supermercado"
                emptyCopy="Nenhum supermercado encontrado neste mês."
                rows={dashboard.top_supermercados.map((item) => ({
                  id: item.id,
                  name: item.nome,
                  value: item.valor_total,
                  detail: `${item.compras_count} compras`,
                }))}
              />
            </div>
          )}
        </>
      )}

      <section className="price-history-section">
        <div className="dashboard-title-row">
          <div>
            <p className="eyebrow">Histórico de preços</p>
            <h2>Acompanhe um produto</h2>
          </div>
        </div>

        <form className="price-search-card" onSubmit={searchProducts}>
          <label>
            Buscar produto ou marca
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              maxLength={100}
              placeholder="Ex.: leite, arroz, detergente"
            />
          </label>
          <button className="capture-button" type="submit">
            Buscar
          </button>
        </form>

        {productsState === "loading" && (
          <section className="processing-card" role="status">
            <span className="spinner" aria-hidden="true" />
            <div>
              <strong>Buscando produtos</strong>
              <p>Carregando os itens que possuem histórico de preços…</p>
            </div>
          </section>
        )}

        {productsState === "error" && (
          <section className="feedback-card error-card" role="alert">
            <strong>Não foi possível buscar produtos</strong>
            <p>{productsError}</p>
          </section>
        )}

        {productsState === "ready" && productResults.length === 0 && (
          <section className="dashboard-empty-card compact">
            <strong>Nenhum produto encontrado</strong>
            <p>Altere a busca ou registre novas compras.</p>
          </section>
        )}

        {productsState === "ready" && productResults.length > 0 && (
          <section className="history-product-filter-card">
            <label>
              Escolha um produto
              <select
                value={selectedProduct?.id ?? ""}
                onChange={(event) => selectHistoryProduct(event.target.value)}
              >
                <option value="">Selecione para analisar o histórico</option>
                {productResults.map((product) => (
                  <option key={product.id} value={product.id}>
                    {historyProductOptionLabel(product)}
                  </option>
                ))}
              </select>
            </label>
            <small>
              {productResults.length}{" "}
              {productResults.length === 1
                ? "produto encontrado"
                : "produtos encontrados"}
              . Cada opção mostra último valor, quantidade de registros e categoria.
            </small>
          </section>
        )}

        {selectedProduct && historyState === "loading" && (
          <section className="processing-card" role="status">
            <span className="spinner" aria-hidden="true" />
            <div>
              <strong>Abrindo o histórico</strong>
              <p>Organizando valores e supermercados…</p>
            </div>
          </section>
        )}

        {selectedProduct && historyState === "error" && (
          <section className="feedback-card error-card" role="alert">
            <strong>Não foi possível abrir o histórico</strong>
            <p>{historyError}</p>
            <button
              className="capture-button retry-detail-button"
              type="button"
              onClick={() => void openHistory(selectedProduct)}
            >
              Tentar novamente
            </button>
          </section>
        )}

        {selectedProduct && historyState === "ready" && history && (
          <section className="price-history-card">
            <div className="price-history-heading">
              <div>
                <span>{history.produto.categoria_nome}</span>
                <h3>{history.produto.nome}</h3>
                {history.produto.marca && <small>{history.produto.marca}</small>}
              </div>
              <strong>{moneyFormatter.format(history.resumo.ultimo_valor)}</strong>
            </div>

            <div className="price-kpi-grid">
              <article>
                <span>Menor</span>
                <strong>{moneyFormatter.format(history.resumo.menor_valor)}</strong>
              </article>
              <article>
                <span>Maior</span>
                <strong>{moneyFormatter.format(history.resumo.maior_valor)}</strong>
              </article>
              <article>
                <span>Variação</span>
                <strong
                  className={
                    history.resumo.variacao_percentual > 0
                      ? "increase"
                      : history.resumo.variacao_percentual < 0
                        ? "decrease"
                        : ""
                  }
                >
                  {history.resumo.variacao_percentual > 0 ? "+" : ""}
                  {history.resumo.variacao_percentual.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}%
                </strong>
              </article>
            </div>

            <PriceLineChart points={history.pontos} />

            <div className="price-point-list">
              {[...history.pontos].reverse().map((point) => (
                <article key={point.id}>
                  <div>
                    <strong>{moneyFormatter.format(point.valor_unitario)}</strong>
                    <span>{point.supermercado_nome}</span>
                  </div>
                  <div>
                    <b>{formatDate(point.data_compra)}</b>
                    <small>
                      {quantityFormatter.format(point.quantidade)} {point.unidade}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </section>
  );
}
