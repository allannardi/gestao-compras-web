import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

type PasswordChangeResult = {
  error: string | null;
};

async function authErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === "object") {
    for (const key of ["msg", "message", "error_description", "error"]) {
      if (key in payload) {
        const value = (payload as Record<string, unknown>)[key];
        if (typeof value === "string" && value.trim()) {
          return value;
        }
      }
    }
  }
  return fallback;
}

export async function changePasswordWithCurrentPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<PasswordChangeResult> {
  if (!supabaseConfigured) {
    return { error: "Supabase ainda não foi configurado." };
  }

  const tokenResponse = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: supabasePublishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password: currentPassword }),
    },
  );

  if (!tokenResponse.ok) {
    return {
      error: await authErrorMessage(
        tokenResponse,
        "A senha atual não foi confirmada.",
      ),
    };
  }

  const tokenPayload: unknown = await tokenResponse.json().catch(() => null);
  const accessToken =
    tokenPayload && typeof tokenPayload === "object" && "access_token" in tokenPayload
      ? String((tokenPayload as Record<string, unknown>).access_token ?? "")
      : "";

  if (!accessToken) {
    return { error: "Não foi possível validar a senha atual." };
  }

  const updateResponse = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
    {
      method: "PUT",
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: newPassword }),
    },
  );

  if (!updateResponse.ok) {
    return {
      error: await authErrorMessage(
        updateResponse,
        "Não foi possível atualizar a senha.",
      ),
    };
  }

  return { error: null };
}
