"use client";

import { useEffect, useState } from "react";

import { APP_VERSION } from "@/lib/version";
import { supabase } from "@/lib/supabase";
import { reportTechnicalEvent } from "@/services/beta";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [supportCode] = useState(() => error.digest || crypto.randomUUID().slice(0, 12));

  useEffect(() => {
    void supabase?.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      void reportTechnicalEvent(API_URL, data.session.access_token, {
        evento: "frontend_error",
        pagina: window.location.pathname,
        app_version: APP_VERSION,
        codigo: supportCode,
      }).catch(() => undefined);
    });
  }, [supportCode]);

  return (
    <main className="page-shell">
      <section className="feedback-card error-card" role="alert">
        <strong>O aplicativo encontrou uma falha</strong>
        <p>Atualize esta tela. Seus dados já salvos continuam no banco online.</p>
        <small>Código de suporte: {supportCode}</small>
        <div className="button-row">
          <button className="ghost-action" type="button" onClick={() => window.location.reload()}>
            Recarregar
          </button>
          <button className="capture-button" type="button" onClick={reset}>
            Tentar novamente
          </button>
        </div>
      </section>
    </main>
  );
}
