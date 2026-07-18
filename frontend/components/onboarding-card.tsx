"use client";

import { useCallback, useEffect, useState } from "react";

import {
  completeOnboardingBeta,
  fetchOnboardingBeta,
} from "@/services/beta";
import type { OnboardingBeta } from "@/types/beta";

type Props = {
  apiUrl: string;
  accessToken: string;
  forceOpenKey: number;
  onAddPurchase: () => void;
  onOpenProducts: () => void;
  onOpenSettings: () => void;
};

type StepProps = {
  done: boolean;
  title: string;
  detail: string;
  actionLabel?: string;
  optional?: boolean;
  onAction?: () => void;
};

function OnboardingStep({
  done,
  title,
  detail,
  actionLabel,
  optional = false,
  onAction,
}: StepProps) {
  return (
    <article className={`onboarding-step ${done ? "done" : "pending"}`}>
      <span className="onboarding-step-status" aria-hidden="true">
        {done ? "✓" : "○"}
      </span>
      <div>
        <strong>
          {title}
          {optional && <small>Opcional</small>}
        </strong>
        <p>{detail}</p>
      </div>
      {!done && actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </article>
  );
}

export function OnboardingCard({
  apiUrl,
  accessToken,
  forceOpenKey,
  onAddPurchase,
  onOpenProducts,
  onOpenSettings,
}: Props) {
  const [data, setData] = useState<OnboardingBeta | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchOnboardingBeta(apiUrl, accessToken);
      setData(result);
      setVisible(result.mostrar || forceOpenKey > 0);
    } catch (loadError: unknown) {
      if (forceOpenKey > 0) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar o guia inicial.",
        );
        setVisible(true);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl, forceOpenKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const finish = async () => {
    setFinishing(true);
    setError("");
    try {
      await completeOnboardingBeta(apiUrl, accessToken);
      setVisible(false);
      setData((current) =>
        current
          ? {
              ...current,
              mostrar: false,
              concluido_em: new Date().toISOString(),
            }
          : current,
      );
    } catch (finishError: unknown) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : "Não foi possível concluir o guia.",
      );
    } finally {
      setFinishing(false);
    }
  };

  if (!visible) return null;

  if (loading && !data) {
    return (
      <section className="processing-card onboarding-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Preparando o guia inicial</strong>
          <p>Verificando os primeiros passos da família…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="onboarding-card" aria-label="Guia inicial">
      <div className="onboarding-heading">
        <div>
          <span>Primeiros passos</span>
          <h2>Prepare sua família para usar o aplicativo</h2>
          <p>
            Este guia não bloqueia nenhuma função. Use as ações abaixo e feche
            quando estiver confortável com o fluxo.
          </p>
        </div>
        <button
          type="button"
          className="onboarding-close"
          aria-label="Fechar guia"
          onClick={() => setVisible(false)}
        >
          ×
        </button>
      </div>

      {error && <p className="onboarding-error">{error}</p>}

      {data && (
        <div className="onboarding-steps">
          <OnboardingStep
            done={data.primeira_compra_concluida}
            title="Registre a primeira compra"
            detail={
              data.primeira_compra_concluida
                ? `${data.compras_count} compra${data.compras_count === 1 ? "" : "s"} registrada${data.compras_count === 1 ? "" : "s"}.`
                : "Leia o QR Code de uma NFC-e ou envie a foto da nota."
            }
            actionLabel="Adicionar compra"
            onAction={() => {
              setVisible(false);
              onAddPurchase();
            }}
          />

          <OnboardingStep
            done={data.revisao_produtos_concluida}
            title="Revise os produtos"
            detail={
              data.produtos_count === 0
                ? "Os produtos aparecerão depois da primeira compra."
                : data.produtos_revisar_count > 0
                  ? `${data.produtos_revisar_count} produto${data.produtos_revisar_count === 1 ? "" : "s"} ainda precisa${data.produtos_revisar_count === 1 ? "" : "m"} de revisão.`
                  : `${data.produtos_count} produto${data.produtos_count === 1 ? "" : "s"} organizado${data.produtos_count === 1 ? "" : "s"}.`
            }
            actionLabel="Abrir produtos"
            onAction={() => {
              setVisible(false);
              onOpenProducts();
            }}
          />

          <OnboardingStep
            done={data.membro_adicional_concluido}
            title="Compartilhe com outra pessoa"
            detail={
              data.membro_adicional_concluido
                ? `${data.membros_count} membros usam esta família.`
                : "Convide alguém para registrar e consultar as mesmas compras."
            }
            optional
            actionLabel="Abrir ajustes"
            onAction={() => {
              setVisible(false);
              onOpenSettings();
            }}
          />
        </div>
      )}

      <div className="onboarding-footer">
        <small>
          O guia pode ser aberto novamente em <strong>Mais → Guia de início</strong>.
        </small>
        <button
          type="button"
          className="capture-button compact-button"
          disabled={finishing || !data}
          onClick={() => void finish()}
        >
          {finishing
            ? "Salvando…"
            : data?.etapas_principais_concluidas
              ? "Finalizar guia"
              : "Entendi, fechar guia"}
        </button>
      </div>
    </section>
  );
}
