export const SESSION_EXPIRED_EVENT = "gestao-compras:session-expired";

export class ApiRequestError extends Error {
  status: number;
  requestId: string;
  code: string;

  constructor(
    message: string,
    options?: { status?: number; requestId?: string; code?: string },
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options?.status ?? 0;
    this.requestId = options?.requestId ?? "";
    this.code = options?.code ?? "API_ERROR";
  }
}

export function apiRequestId(response: Response): string {
  return response.headers.get("x-request-id")?.trim() ?? "";
}

export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string" &&
    payload.detail.trim()
  ) {
    return payload.detail.trim();
  }
  return fallback;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiRequestError(
      navigator.onLine
        ? "Não foi possível conectar ao servidor. Aguarde alguns segundos e tente novamente."
        : "O aparelho está sem conexão com a internet.",
      { code: "NETWORK_ERROR" },
    );
  }

  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }

  return response;
}
