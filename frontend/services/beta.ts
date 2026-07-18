import {
  ApiRequestError,
  apiErrorMessage,
  apiFetch,
  apiRequestId,
} from "@/lib/api-client";
import type {
  AceiteLegalRegistrado,
  AceiteLegalStatus,
  EventoTecnico,
  OnboardingBeta,
  OnboardingConcluido,
  PrivacidadeRegistrada,
} from "@/types/beta";

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
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
    throw new ApiRequestError(
      apiErrorMessage(payload, "Não foi possível carregar a preparação para beta."),
      {
        status: response.status,
        requestId: apiRequestId(response),
        code: `HTTP_${response.status}`,
      },
    );
  }
  return payload as T;
}

export function fetchLegalAcceptance(
  apiUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AceiteLegalStatus> {
  return request<AceiteLegalStatus>(
    `${normalizeApiUrl(apiUrl)}/api/v1/beta/aceite-legal`,
    accessToken,
    { signal },
  );
}

export function acceptLegalDocuments(
  apiUrl: string,
  accessToken: string,
  termosVersao: string,
  privacidadeVersao: string,
): Promise<AceiteLegalRegistrado> {
  return request<AceiteLegalRegistrado>(
    `${normalizeApiUrl(apiUrl)}/api/v1/beta/aceite-legal`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        termos_versao: termosVersao,
        privacidade_versao: privacidadeVersao,
      }),
    },
  );
}

export function reportTechnicalEvent(
  apiUrl: string,
  accessToken: string,
  payload: {
    evento: EventoTecnico;
    pagina: string;
    app_version: string;
    codigo: string;
    request_id?: string;
  },
): Promise<{ recebido: boolean }> {
  return request<{ recebido: boolean }>(
    `${normalizeApiUrl(apiUrl)}/api/v1/beta/telemetria`,
    accessToken,
    { method: "POST", body: JSON.stringify(payload) },
  );
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
