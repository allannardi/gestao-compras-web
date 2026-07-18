import {
  ApiRequestError,
  apiErrorMessage,
  apiFetch,
  apiRequestId,
} from "@/lib/api-client";
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
