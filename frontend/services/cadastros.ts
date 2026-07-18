import type {
  CadastrosData,
  CategoriaAtualizada,
  SupermercadoAtualizado,
} from "@/types/cadastros";

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function getApiError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

async function apiRequest<T>(
  apiUrl: string,
  accessToken: string,
  path: string,
  init: RequestInit = {},
  fallback: string,
): Promise<T> {
  const response = await fetch(`${normalizeApiUrl(apiUrl)}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiError(payload, fallback));
  }
  return payload as T;
}

export function fetchRegistries(
  apiUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CadastrosData> {
  return apiRequest<CadastrosData>(
    apiUrl,
    accessToken,
    "/api/v1/cadastros",
    { signal },
    "Não foi possível carregar categorias e supermercados.",
  );
}

export function updateRegistryCategory(
  apiUrl: string,
  accessToken: string,
  categoryId: string,
  name: string,
): Promise<CategoriaAtualizada> {
  return apiRequest<CategoriaAtualizada>(
    apiUrl,
    accessToken,
    `/api/v1/cadastros/categorias/${encodeURIComponent(categoryId)}`,
    { method: "PATCH", body: JSON.stringify({ nome: name }) },
    "Não foi possível atualizar a categoria.",
  );
}

export function deactivateRegistryCategory(
  apiUrl: string,
  accessToken: string,
  categoryId: string,
  destinationId: string,
): Promise<CategoriaAtualizada> {
  return apiRequest<CategoriaAtualizada>(
    apiUrl,
    accessToken,
    `/api/v1/cadastros/categorias/${encodeURIComponent(categoryId)}/desativar`,
    {
      method: "POST",
      body: JSON.stringify({ categoria_destino_id: destinationId }),
    },
    "Não foi possível desativar a categoria.",
  );
}

export function reactivateRegistryCategory(
  apiUrl: string,
  accessToken: string,
  categoryId: string,
): Promise<CategoriaAtualizada> {
  return apiRequest<CategoriaAtualizada>(
    apiUrl,
    accessToken,
    `/api/v1/cadastros/categorias/${encodeURIComponent(categoryId)}/reativar`,
    { method: "POST" },
    "Não foi possível reativar a categoria.",
  );
}

export function updateRegistrySupermarket(
  apiUrl: string,
  accessToken: string,
  supermarketId: string,
  name: string,
): Promise<SupermercadoAtualizado> {
  return apiRequest<SupermercadoAtualizado>(
    apiUrl,
    accessToken,
    `/api/v1/cadastros/supermercados/${encodeURIComponent(supermarketId)}`,
    { method: "PATCH", body: JSON.stringify({ nome: name }) },
    "Não foi possível atualizar o supermercado.",
  );
}

export function mergeRegistrySupermarkets(
  apiUrl: string,
  accessToken: string,
  sourceId: string,
  destinationId: string,
): Promise<SupermercadoAtualizado> {
  return apiRequest<SupermercadoAtualizado>(
    apiUrl,
    accessToken,
    `/api/v1/cadastros/supermercados/${encodeURIComponent(sourceId)}/mesclar`,
    {
      method: "POST",
      body: JSON.stringify({
        supermercado_destino_id: destinationId,
        confirmacao: "UNIR",
      }),
    },
    "Não foi possível unir os supermercados.",
  );
}
