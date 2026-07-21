import { apiFetch } from "@/lib/api-client";
import type {
  AdminAccess,
  AdminAction,
  AdminAuditoriaLista,
  AdminFamiliaDetalhes,
  AdminFamiliasLista,
  AdminResumo,
  AdminUsuarioDetalhes,
  AdminUsuariosLista,
} from "@/types/admin-geral";

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function errorMessage(payload: unknown, fallback: string): string {
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

async function request<T>(
  apiUrl: string,
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await apiFetch(`${normalizeApiUrl(apiUrl)}/api/v1${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(payload, "Não foi possível concluir a ação administrativa."));
  }
  return payload as T;
}

export function fetchAdminAccess(apiUrl: string, accessToken: string): Promise<AdminAccess> {
  return request(apiUrl, accessToken, "/admin-geral/me");
}

export function fetchAdminSummary(apiUrl: string, accessToken: string): Promise<AdminResumo> {
  return request(apiUrl, accessToken, "/admin-geral/resumo");
}

export function fetchAdminFamilies(
  apiUrl: string,
  accessToken: string,
  search = "",
  status = "",
): Promise<AdminFamiliasLista> {
  const query = new URLSearchParams({ limite: "100", offset: "0" });
  if (search.trim()) query.set("busca", search.trim());
  if (status) query.set("situacao", status);
  return request(apiUrl, accessToken, `/admin-geral/familias?${query.toString()}`);
}

export function fetchAdminFamily(
  apiUrl: string,
  accessToken: string,
  familyId: string,
): Promise<AdminFamiliaDetalhes> {
  return request(apiUrl, accessToken, `/admin-geral/familias/${encodeURIComponent(familyId)}`);
}

export function updateAdminFamily(
  apiUrl: string,
  accessToken: string,
  familyId: string,
  payload: { nome?: string; observacao?: string | null },
): Promise<AdminAction> {
  return request(apiUrl, accessToken, `/admin-geral/familias/${encodeURIComponent(familyId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changeAdminFamilyStatus(
  apiUrl: string,
  accessToken: string,
  familyId: string,
  action: "suspender" | "reativar",
  motivo: string,
): Promise<AdminAction> {
  return request(
    apiUrl,
    accessToken,
    `/admin-geral/familias/${encodeURIComponent(familyId)}/${action}`,
    { method: "POST", body: JSON.stringify({ motivo }) },
  );
}

export function deleteAdminFamily(
  apiUrl: string,
  accessToken: string,
  familyId: string,
  payload: { nome_confirmacao: string; confirmacao: string; motivo: string },
): Promise<AdminAction> {
  return request(apiUrl, accessToken, `/admin-geral/familias/${encodeURIComponent(familyId)}`, {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminUsers(
  apiUrl: string,
  accessToken: string,
  search = "",
): Promise<AdminUsuariosLista> {
  const query = new URLSearchParams({ limite: "100", offset: "0" });
  if (search.trim()) query.set("busca", search.trim());
  return request(apiUrl, accessToken, `/admin-geral/usuarios?${query.toString()}`);
}

export function fetchAdminUser(
  apiUrl: string,
  accessToken: string,
  userId: string,
): Promise<AdminUsuarioDetalhes> {
  return request(apiUrl, accessToken, `/admin-geral/usuarios/${encodeURIComponent(userId)}`);
}

export function updateAdminMemberRole(
  apiUrl: string,
  accessToken: string,
  familyId: string,
  userId: string,
  papel: "administrador" | "membro",
): Promise<AdminAction> {
  return request(
    apiUrl,
    accessToken,
    `/admin-geral/familias/${encodeURIComponent(familyId)}/membros/${encodeURIComponent(userId)}`,
    { method: "PATCH", body: JSON.stringify({ papel }) },
  );
}

export function removeAdminMember(
  apiUrl: string,
  accessToken: string,
  familyId: string,
  userId: string,
): Promise<AdminAction> {
  return request(
    apiUrl,
    accessToken,
    `/admin-geral/familias/${encodeURIComponent(familyId)}/membros/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

export function resetAdminUserPassword(
  apiUrl: string,
  accessToken: string,
  userId: string,
): Promise<AdminAction> {
  return request(
    apiUrl,
    accessToken,
    `/admin-geral/usuarios/${encodeURIComponent(userId)}/redefinir-senha`,
    { method: "POST" },
  );
}

export function deleteAdminUser(
  apiUrl: string,
  accessToken: string,
  userId: string,
  payload: { email_confirmacao: string; confirmacao: string; motivo: string },
): Promise<AdminAction> {
  return request(apiUrl, accessToken, `/admin-geral/usuarios/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminAudit(
  apiUrl: string,
  accessToken: string,
  search = "",
): Promise<AdminAuditoriaLista> {
  const query = new URLSearchParams({ limite: "150", offset: "0" });
  if (search.trim()) query.set("busca", search.trim());
  return request(apiUrl, accessToken, `/admin-geral/auditoria?${query.toString()}`);
}
