import { apiFetch } from "@/lib/api-client";
import type {
  OnboardingBeta,
  OnboardingConcluido,
  PrivacidadeRegistrada,
} from "@/types/beta";

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

async function request<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await apiFetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível carregar a preparação para beta."),
    );
  }
  return payload as T;
}

export function fetchOnboardingBeta(
  apiUrl: string,
  accessToken: string,
): Promise<OnboardingBeta> {
  return request<OnboardingBeta>(
    `${normalizeApiUrl(apiUrl)}/api/v1/beta/onboarding`,
    accessToken,
  );
}

export function completeOnboardingBeta(
  apiUrl: string,
  accessToken: string,
): Promise<OnboardingConcluido> {
  return request<OnboardingConcluido>(
    `${normalizeApiUrl(apiUrl)}/api/v1/beta/onboarding/concluir`,
    accessToken,
    { method: "POST" },
  );
}

export function registerPrivacyView(
  apiUrl: string,
  accessToken: string,
): Promise<PrivacidadeRegistrada> {
  return request<PrivacidadeRegistrada>(
    `${normalizeApiUrl(apiUrl)}/api/v1/beta/privacidade/visualizacao`,
    accessToken,
    { method: "POST" },
  );
}
