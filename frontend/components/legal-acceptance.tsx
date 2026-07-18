"use client";

import Link from "next/link";
import { useState } from "react";

import { acceptLegalDocuments } from "@/services/beta";
import type { AceiteLegalStatus } from "@/types/beta";

type Props = {
  apiUrl: string;
  accessToken: string;
  status: AceiteLegalStatus;
  onAccepted: (status: AceiteLegalStatus) => void;
  onLogout: () => Promise<void>;
};

export function LegalAcceptance({
  apiUrl,
  accessToken,
  status,
  onAccepted,
  onLogout,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    if (!confirmed) {
      setError("Leia os documentos e marque a confirmação para continuar.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await acceptLegalDocuments(
        apiUrl,
        accessToken,
        status.termos_versao_atual,
        status.privacidade_versao_atual,
      );
      onAccepted({
        ...status,
        aceito: true,
        termos_versao_aceita: result.termos_versao,
        privacidade_versao_aceita: result.privacidade_versao,
        aceito_em: result.aceito_em,
      });
    } catch (acceptError: unknown) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Não foi possível registrar o aceite.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="legal-acceptance-card" aria-labelledby="legal-title">
      <p className="eyebrow">Beta controlado</p>
      <h1 id="legal-title">Antes de continuar</h1>
      <p>
        Leia os Termos do beta e o Aviso de Privacidade. O aceite fica vinculado
        à sua conta e só será solicitado novamente quando uma versão mudar.
      </p>

      <div className="legal-document-links">
        <Link href="/termos" target="_blank" rel="noreferrer">
          Abrir Termos do beta
        </Link>
        <Link href="/politica-de-privacidade" target="_blank" rel="noreferrer">
          Abrir Aviso de Privacidade
        </Link>
      </div>

      <label className="legal-checkbox-row">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>
          Li e aceito os Termos v{status.termos_versao_atual} e o Aviso de
          Privacidade v{status.privacidade_versao_atual}.
        </span>
      </label>

      {error && <p className="auth-message">{error}</p>}

      <div className="button-row">
        <button
          className="ghost-action"
          type="button"
          disabled={submitting}
          onClick={() => void onLogout()}
        >
          Sair
        </button>
        <button
          className="capture-button"
          type="button"
          disabled={submitting}
          onClick={() => void accept()}
        >
          {submitting ? "Registrando…" : "Aceitar e continuar"}
        </button>
      </div>
    </section>
  );
}
