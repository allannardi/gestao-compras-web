import type {
  ConfiguracoesData,
  ConviteCriadoResponse,
  MensagemResponse,
} from "@/types/configuracoes";

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

function authHeaders(accessToken: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function requestMessage<T extends MensagemResponse = MensagemResponse>(
  url: string,
  accessToken: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: authHeaders(accessToken, Boolean(init.body)),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiError(payload, "Não foi possível concluir a ação."));
  }
  return payload as T;
}

export async function fetchSettings(
  apiUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<ConfiguracoesData> {
  const response = await fetch(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes`,
    {
      cache: "no-store",
      headers: authHeaders(accessToken),
      signal,
    },
  );
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      getApiError(payload, "Não foi possível carregar as configurações."),
    );
  }
  return payload as ConfiguracoesData;
}

export function updateProfile(
  apiUrl: string,
  accessToken: string,
  nome: string,
): Promise<MensagemResponse> {
  return requestMessage(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes/perfil`,
    accessToken,
    { method: "PATCH", body: JSON.stringify({ nome }) },
  );
}

export function updateFamily(
  apiUrl: string,
  accessToken: string,
  nome: string,
): Promise<MensagemResponse> {
  return requestMessage(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes/familia`,
    accessToken,
    { method: "PATCH", body: JSON.stringify({ nome }) },
  );
}

export function createInvitation(
  apiUrl: string,
  accessToken: string,
  email: string,
  papel: string,
): Promise<ConviteCriadoResponse> {
  return requestMessage<ConviteCriadoResponse>(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes/convites`,
    accessToken,
    { method: "POST", body: JSON.stringify({ email, papel }) },
  );
}

export function generateInvitationLink(
  apiUrl: string,
  accessToken: string,
  invitationId: string,
): Promise<ConviteCriadoResponse> {
  return requestMessage<ConviteCriadoResponse>(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes/convites/${encodeURIComponent(invitationId)}/link`,
    accessToken,
    { method: "POST" },
  );
}

export function cancelInvitation(
  apiUrl: string,
  accessToken: string,
  invitationId: string,
): Promise<MensagemResponse> {
  return requestMessage(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes/convites/${encodeURIComponent(invitationId)}`,
    accessToken,
    { method: "DELETE" },
  );
}

export function acceptInvitation(
  apiUrl: string,
  accessToken: string,
  invitationId: string,
): Promise<MensagemResponse> {
  return requestMessage(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes/convites/${encodeURIComponent(invitationId)}/aceitar`,
    accessToken,
    { method: "POST" },
  );
}

export function selectFamily(
  apiUrl: string,
  accessToken: string,
  familyId: string,
): Promise<MensagemResponse> {
  return requestMessage(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes/familias/${encodeURIComponent(familyId)}/selecionar`,
    accessToken,
    { method: "POST" },
  );
}

export function updateMemberRole(
  apiUrl: string,
  accessToken: string,
  userId: string,
  papel: string,
): Promise<MensagemResponse> {
  return requestMessage(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes/membros/${encodeURIComponent(userId)}`,
    accessToken,
    { method: "PATCH", body: JSON.stringify({ papel }) },
  );
}

export function removeMember(
  apiUrl: string,
  accessToken: string,
  userId: string,
): Promise<MensagemResponse> {
  return requestMessage(
    `${normalizeApiUrl(apiUrl)}/api/v1/configuracoes/membros/${encodeURIComponent(userId)}`,
    accessToken,
    { method: "DELETE" },
  );
}
