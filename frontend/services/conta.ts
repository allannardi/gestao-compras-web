import { apiFetch } from "@/lib/api-client";
import type {
  ExclusaoContaResponse,
  ExclusaoFamiliaResponse,
} from "@/types/conta";

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function getApiError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = payload.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return fallback;
}

async function postJson<T>(
  url: string,
  accessToken: string,
  body: Record<string, string>,
): Promise<T> {
  const response = await apiFetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível concluir a exclusão."));
  }
  return payload as T;
}

export function deleteOwnAccount(
  apiUrl: string,
  verifiedAccessToken: string,
  emailConfirmation: string,
): Promise<ExclusaoContaResponse> {
  return postJson<ExclusaoContaResponse>(
    `${normalizeApiUrl(apiUrl)}/api/v1/conta/excluir`,
    verifiedAccessToken,
    { email_confirmacao: emailConfirmation },
  );
}

export function deleteCurrentFamily(
  apiUrl: string,
  verifiedAccessToken: string,
  familyNameConfirmation: string,
): Promise<ExclusaoFamiliaResponse> {
  return postJson<ExclusaoFamiliaResponse>(
    `${normalizeApiUrl(apiUrl)}/api/v1/conta/familia/excluir`,
    verifiedAccessToken,
    { nome_confirmacao: familyNameConfirmation },
  );
}
