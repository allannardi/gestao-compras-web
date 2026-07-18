import type { ExportacaoResumo } from "@/types/exportacoes";

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

function normalizeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").toLowerCase();
}

function filenameFromDisposition(response: Response, fallback: string): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
  return regularMatch?.[1] || fallback;
}

export async function fetchExportSummary(
  apiUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<ExportacaoResumo> {
  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/exportacoes/resumo`,
    {
      cache: "no-store",
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível preparar o resumo da exportação."),
    );
  }
  return payload as ExportacaoResumo;
}

export async function downloadFamilyExport(
  apiUrl: string,
  accessToken: string,
  kind: "excel" | "backup",
  familyName: string,
): Promise<string> {
  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/exportacoes/${kind}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(
      getApiError(payload, "Não foi possível gerar o arquivo solicitado."),
    );
  }

  const extension = kind === "excel" ? "xlsx" : "json";
  const date = new Date().toISOString().slice(0, 10);
  const fallback = `${kind === "excel" ? "gestao-compras" : "backup-gestao-compras"}-${normalizeFilename(familyName)}-${date}.${extension}`;
  const filename = filenameFromDisposition(response, fallback);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return filename;
}
