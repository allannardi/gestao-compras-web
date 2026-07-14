import type { CompraSalva } from "@/types/compras";
import type { NfcePreview } from "@/types/nfce";

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function getApiError(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }

  return "Não foi possível salvar a compra.";
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

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getApiError(payload));
  }

  return payload as CompraSalva;
}
