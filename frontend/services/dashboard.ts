import type {
  DashboardData,
  HistoricoProdutoData,
  HistoricoProdutoOpcao,
  SupermercadoResumo,
} from "@/types/dashboard";

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function getApiError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = payload.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }
  return fallback;
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchSupermarkets(
  apiUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<SupermercadoResumo[]> {
  const response = await fetch(`${normalizeApiUrl(apiUrl)}/api/v1/supermercados`, {
    cache: "no-store",
    headers: authHeaders(accessToken),
    signal,
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível carregar os supermercados."),
    );
  }

  return payload as SupermercadoResumo[];
}

export async function fetchDashboard(
  apiUrl: string,
  accessToken: string,
  month: string,
  signal?: AbortSignal,
): Promise<DashboardData> {
  const query = new URLSearchParams();
  if (/^\d{4}-\d{2}$/.test(month)) {
    query.set("mes", `${month}-01`);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/dashboard${suffix}`,
    {
      cache: "no-store",
      headers: authHeaders(accessToken),
      signal,
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível carregar o resumo mensal."),
    );
  }

  return payload as DashboardData;
}

export async function searchHistoryProducts(
  apiUrl: string,
  accessToken: string,
  search: string,
  signal?: AbortSignal,
): Promise<HistoricoProdutoOpcao[]> {
  const query = new URLSearchParams({ limite: "20" });
  const normalizedSearch = search.trim();
  if (normalizedSearch) {
    query.set("busca", normalizedSearch);
  }

  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/historico-precos/produtos?${query.toString()}`,
    {
      cache: "no-store",
      headers: authHeaders(accessToken),
      signal,
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível buscar produtos com histórico."),
    );
  }

  return payload as HistoricoProdutoOpcao[];
}

export async function fetchProductPriceHistory(
  apiUrl: string,
  accessToken: string,
  productId: string,
  signal?: AbortSignal,
): Promise<HistoricoProdutoData> {
  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/historico-precos/produtos/${encodeURIComponent(productId)}?limite=30`,
    {
      cache: "no-store",
      headers: authHeaders(accessToken),
      signal,
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível abrir o histórico do produto."),
    );
  }

  return payload as HistoricoProdutoData;
}
