import type { FamilyContext } from "@/types/auth";

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

  return "Não foi possível carregar sua família.";
}

export async function fetchFamilyContext(
  apiUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<FamilyContext> {
  const response = await fetch(`${normalizeApiUrl(apiUrl)}/api/v1/auth/me`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getApiError(payload));
  }

  return payload as FamilyContext;
}
