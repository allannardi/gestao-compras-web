import type {
  CategoriaCriada,
  CategoriaResumo,
  ProdutoAtualizado,
  ProdutoCandidatosMesclagem,
  ProdutoLista,
  ProdutoMesclagemResultado,
  ProdutoUpdatePayload,
  ReclassificacaoResultado,
} from "@/types/produtos";
import { apiFetch } from "@/lib/api-client";

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

export async function fetchProducts(
  apiUrl: string,
  accessToken: string,
  offset = 0,
  limit = 20,
  search = "",
  onlyReview = false,
  categoryId = "",
  signal?: AbortSignal,
): Promise<ProdutoLista> {
  const query = new URLSearchParams({
    limite: String(limit),
    offset: String(offset),
    somente_revisar: String(onlyReview),
  });

  if (search.trim()) query.set("busca", search.trim());
  if (categoryId) query.set("categoria_id", categoryId);

  const response = await apiFetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/produtos?${query.toString()}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível carregar os produtos."));
  }

  return payload as ProdutoLista;
}

export async function fetchCategories(
  apiUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CategoriaResumo[]> {
  const response = await apiFetch(`${normalizeApiUrl(apiUrl)}/api/v1/categorias`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível carregar as categorias."));
  }

  return payload as CategoriaResumo[];
}

export async function updateProduct(
  apiUrl: string,
  accessToken: string,
  productId: string,
  payload: ProdutoUpdatePayload,
): Promise<ProdutoAtualizado> {
  const response = await apiFetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/produtos/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiError(result, "Não foi possível atualizar o produto."));
  }

  return result as ProdutoAtualizado;
}

export async function createCategory(
  apiUrl: string,
  accessToken: string,
  name: string,
): Promise<CategoriaCriada> {
  const response = await apiFetch(`${normalizeApiUrl(apiUrl)}/api/v1/categorias`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nome: name }),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível criar a categoria."));
  }

  return payload as CategoriaCriada;
}

export async function reclassifyProducts(
  apiUrl: string,
  accessToken: string,
): Promise<ReclassificacaoResultado> {
  const response = await apiFetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/produtos/reclassificar`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível reclassificar os produtos."));
  }

  return payload as ReclassificacaoResultado;
}

export async function fetchMergeCandidates(
  apiUrl: string,
  accessToken: string,
  productId: string,
  search = "",
  signal?: AbortSignal,
): Promise<ProdutoCandidatosMesclagem> {
  const query = new URLSearchParams({ limite: "100" });
  if (search.trim()) query.set("busca", search.trim());

  const response = await apiFetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/produtos/${encodeURIComponent(productId)}/candidatos-mesclagem?${query.toString()}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível carregar os produtos para mesclagem."),
    );
  }

  return payload as ProdutoCandidatosMesclagem;
}

export async function mergeProducts(
  apiUrl: string,
  accessToken: string,
  principalProductId: string,
  incorporatedProductId: string,
): Promise<ProdutoMesclagemResultado> {
  const response = await apiFetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/produtos/${encodeURIComponent(principalProductId)}/mesclar`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ produto_incorporado_id: incorporatedProductId }),
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível mesclar os produtos."));
  }

  return payload as ProdutoMesclagemResultado;
}

