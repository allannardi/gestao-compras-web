"use client";

import { useEffect, useState } from "react";

import {
  downloadFamilyExport,
  fetchExportSummary,
} from "@/services/exportacoes";
import type { ExportacaoResumo } from "@/types/exportacoes";

type Props = {
  apiUrl: string;
  accessToken: string;
};

type LoadState = "loading" | "ready" | "error";
type DownloadKind = "excel" | "backup" | "";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Sem compras";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function ExportsCard({ apiUrl, accessToken }: Props) {
  const [state, setState] = useState<LoadState>("loading");
  const [summary, setSummary] = useState<ExportacaoResumo | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState<DownloadKind>("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetchExportSummary(apiUrl, accessToken, controller.signal)
      .then((result) => {
        setSummary(result);
        setState("ready");
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar a exportação.",
        );
        setState("error");
      });

    return () => controller.abort();
  }, [accessToken, apiUrl, reload]);

  const download = async (kind: Exclude<DownloadKind, "">) => {
    if (!summary) return;
    setDownloading(kind);
    setError("");
    setMessage("");
    try {
      const filename = await downloadFamilyExport(
        apiUrl,
        accessToken,
        kind,
        summary.familia_nome,
      );
      setMessage(`${filename} foi preparado para download.`);
    } catch (downloadError: unknown) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Não foi possível baixar o arquivo.",
      );
    } finally {
      setDownloading("");
    }
  };

  return (
    <section className="settings-card exports-settings-card">
      <div className="settings-card-heading">
        <div>
          <span>Exportação e backup</span>
          <h3>Guarde uma cópia dos dados</h3>
        </div>
        <small>Somente administradores</small>
      </div>

      {state === "loading" && (
        <div className="exports-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Contando os registros da família…</span>
        </div>
      )}

      {state === "error" && (
        <div className="exports-inline-feedback error-card" role="alert">
          <strong>Não foi possível preparar a exportação</strong>
          <span>{error}</span>
          <button type="button" onClick={() => { setState("loading"); setError(""); setReload((value) => value + 1); }}>
            Tentar novamente
          </button>
        </div>
      )}

      {summary && state === "ready" && (
        <>
          <div className="export-kpi-grid">
            <span><small>Compras</small><strong>{summary.compras_count}</strong></span>
            <span><small>Itens</small><strong>{summary.itens_count}</strong></span>
            <span><small>Produtos</small><strong>{summary.produtos_count}</strong></span>
            <span><small>Registros de preço</small><strong>{summary.historicos_count}</strong></span>
          </div>

          <div className="export-period-card">
            <span>
              <small>Período disponível</small>
              <strong>{formatDate(summary.primeira_compra)} até {formatDate(summary.ultima_compra)}</strong>
            </span>
            <span>
              <small>Total confirmado</small>
              <strong>{formatCurrency(summary.valor_total)}</strong>
            </span>
          </div>

          <div className="export-action-grid">
            <article className="export-action-card">
              <div>
                <span aria-hidden="true">▦</span>
                <strong>Excel completo</strong>
              </div>
              <p>
                Compras, itens, produtos, preços, mercados, categorias e membros em abas organizadas.
              </p>
              <button
                className="capture-button"
                type="button"
                disabled={Boolean(downloading)}
                onClick={() => void download("excel")}
              >
                {downloading === "excel" ? "Gerando Excel…" : "Baixar Excel"}
              </button>
            </article>

            <article className="export-action-card">
              <div>
                <span aria-hidden="true">⤓</span>
                <strong>Backup JSON</strong>
              </div>
              <p>
                Cópia técnica completa para guardar com segurança. A restauração será adicionada em versão futura.
              </p>
              <button
                className="secondary-action"
                type="button"
                disabled={Boolean(downloading)}
                onClick={() => void download("backup")}
              >
                {downloading === "backup" ? "Gerando backup…" : "Baixar backup"}
              </button>
            </article>
          </div>
        </>
      )}

      {(message || (error && state !== "error")) && (
        <p className={`exports-message ${error ? "exports-message-error" : ""}`} role={error ? "alert" : "status"}>
          {error || message}
        </p>
      )}

      <p className="settings-help-copy exports-privacy-note">
        Os arquivos são gerados somente quando você solicita e respeitam a família ativa da sua sessão.
      </p>
    </section>
  );
}
