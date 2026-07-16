import type { ConviteAceito, ConvitePublico } from "@/types/convites";

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

export async function fetchPublicInvitation(
  apiUrl: string,
  token: string,
  signal?: AbortSignal,
): Promise<ConvitePublico> {
  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/convites/publico/${encodeURIComponent(token)}`,
    { cache: "no-store", signal },
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível abrir o convite."));
  }
  return payload as ConvitePublico;
}

export async function acceptInvitationToken(
  apiUrl: string,
  accessToken: string,
  token: string,
): Promise<ConviteAceito> {
  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/convites/aceitar`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    },
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível aceitar o convite."));
  }
  return payload as ConviteAceito;
}
