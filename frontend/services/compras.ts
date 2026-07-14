import type {
  CompraDetalhe,
  CompraLista,
  CompraSalva,
} from "@/types/compras";
import type { NfcePreview } from "@/types/nfce";

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function getApiError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }

  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function savePurchase(
  apiUrl: string,
  accessToken: string,
  preview: NfcePreview,
): Promise<CompraSalva> {
  const response = await fetch(`${normalizeApiUrl(apiUrl)}/api/v1/compras`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      qr_texto: preview.qr_texto,
      chave_nfce: preview.chave_nfce,
      mercado_nome: preview.mercado_nome || "Mercado não identificado",
      cnpj: preview.cnpj,
      data_compra: preview.data_compra,
      valor_total: preview.valor_total,
      forma_pagamento: preview.forma_pagamento,
      valor_pago: preview.valor_pago,
      itens: preview.itens,
    }),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível salvar a compra."));
  }

  return payload as CompraSalva;
}

export async function fetchPurchases(
  apiUrl: string,
  accessToken: string,
  offset = 0,
  limit = 20,
  signal?: AbortSignal,
): Promise<CompraLista> {
  const query = new URLSearchParams({
    limite: String(limit),
    offset: String(offset),
  });

  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/compras?${query.toString()}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível carregar as compras."),
    );
  }

  return payload as CompraLista;
}

export async function fetchPurchaseDetail(
  apiUrl: string,
  accessToken: string,
  purchaseId: string,
  signal?: AbortSignal,
): Promise<CompraDetalhe> {
  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/compras/${encodeURIComponent(purchaseId)}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível abrir os detalhes da compra."),
    );
  }

  return payload as CompraDetalhe;
}
