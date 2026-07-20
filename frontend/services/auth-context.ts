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
import type { FamilyContext } from "@/types/auth";

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Operação cancelada.", "AbortError"));
      return;
    }

    const timer = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Operação cancelada.", "AbortError"));
      },
      { once: true },
    );
  });
}

function directContextError(payload: unknown, fallback: string): string {
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

function normalizeContextPayload(payload: unknown): FamilyContext | null {
  const context = Array.isArray(payload) ? payload[0] : payload;
  if (!context || typeof context !== "object") return null;

  const record = context as Record<string, unknown>;
  if (!record.familia_id) return null;

  return {
    user_id: String(record.user_id ?? ""),
    email: String(record.email ?? ""),
    nome: String(record.nome ?? "Usuário"),
    familia_id: String(record.familia_id),
    familia_nome: String(record.familia_nome ?? "Minha família"),
    papel: String(record.papel ?? "membro"),
  };
}

export async function fetchFamilyContextDirect(
  accessToken: string,
  signal?: AbortSignal,
): Promise<FamilyContext> {
  if (!supabaseConfigured) {
    throw new Error("Supabase ainda não foi configurado no frontend.");
  }

  let response: Response;
  try {
    response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/meu_contexto`,
      {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          apikey: supabasePublishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(
      navigator.onLine
        ? "Não foi possível acessar os dados da família. Tente novamente."
        : "O aparelho está sem conexão com a internet.",
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      directContextError(payload, "Não foi possível carregar sua família."),
    );
  }

  const context = normalizeContextPayload(payload);
  if (!context) {
    throw new Error(
      "Sua sessão existe, mas a família ainda não foi preparada. Saia e entre novamente.",
    );
  }

  return context;
}

export async function fetchFamilyContext(
  apiUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<FamilyContext> {
  const retryDelays = [0, 1_500, 3_000, 5_000, 8_000];
  let lastError: unknown = null;

  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    const delay = retryDelays[attempt];
    if (delay > 0) await wait(delay, signal);

    try {
      const response = await apiFetch(
        `${normalizeApiUrl(apiUrl)}/api/v1/auth/me`,
        {
          cache: "no-store",
          headers: { Authorization: `Bearer ${accessToken}` },
          signal,
        },
      );

      const payload: unknown = await response.json().catch(() => null);
      if (response.ok) return payload as FamilyContext;

      const error = new ApiRequestError(
        apiErrorMessage(payload, "Não foi possível carregar sua família."),
        {
          status: response.status,
          requestId: apiRequestId(response),
          code: `HTTP_${response.status}`,
        },
      );

      if (![502, 503, 504].includes(response.status)) throw error;
      lastError = error;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      lastError = error;

      if (
        error instanceof ApiRequestError &&
        error.status > 0 &&
        ![502, 503, 504].includes(error.status)
      ) {
        throw error;
      }
    }
  }

  throw (
    lastError ??
    new ApiRequestError("Não foi possível carregar sua família.", {
      code: "CONTEXT_UNAVAILABLE",
    })
  );
}
