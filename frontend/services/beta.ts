import {
  ApiRequestError,
  apiErrorMessage,
  apiFetch,
  apiRequestId,
} from "@/lib/api-client";
import {
  supabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase";
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

function normalizeRpcPayload<T>(payload: unknown): T {
  if (Array.isArray(payload)) {
    return (payload[0] ?? null) as T;
  }
  return payload as T;
}

function directRpcError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    for (const key of ["message", "details", "hint", "error"]) {
      if (key in payload) {
        const value = (payload as Record<string, unknown>)[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
  }
  return fallback;
}

async function directRpc<T>(
  functionName: string,
  accessToken: string,
  parameters: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  if (!supabaseConfigured) {
    throw new Error("Supabase ainda não foi configurado no frontend.");
  }

  let response: Response;
  try {
    response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${functionName}`,
      {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          apikey: supabasePublishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parameters),
      },
    );
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(
      navigator.onLine
        ? "Não foi possível acessar o banco online. Tente novamente."
        : "O aparelho está sem conexão com a internet.",
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      directRpcError(payload, "Não foi possível verificar os documentos do beta."),
    );
  }

  return normalizeRpcPayload<T>(payload);
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

export function fetchLegalAcceptanceDirect(
  accessToken: string,
  signal?: AbortSignal,
): Promise<AceiteLegalStatus> {
  return directRpc<AceiteLegalStatus>(
    "obter_status_aceite_legal",
    accessToken,
    {},
    signal,
  );
}

export function acceptLegalDocumentsDirect(
  accessToken: string,
  termosVersao: string,
  privacidadeVersao: string,
  signal?: AbortSignal,
): Promise<AceiteLegalRegistrado> {
  return directRpc<AceiteLegalRegistrado>(
    "registrar_aceite_legal",
    accessToken,
    {
      p_termos_versao: termosVersao,
      p_privacidade_versao: privacidadeVersao,
    },
    signal,
  );
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
