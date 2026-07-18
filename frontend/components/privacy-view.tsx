"use client";

import { useEffect } from "react";

import { APP_VERSION } from "@/lib/version";
import { registerPrivacyView } from "@/services/beta";

type Props = {
  apiUrl: string;
  accessToken: string;
  apiVersion: string;
  onOpenSettings: () => void;
  onClose: () => void;
};

export function PrivacyView({
  apiUrl,
  accessToken,
  apiVersion,
  onOpenSettings,
  onClose,
}: Props) {
  useEffect(() => {
    void registerPrivacyView(apiUrl, accessToken).catch(() => undefined);
  }, [accessToken, apiUrl]);

  return (
    <section className="privacy-section">
      <div className="settings-title-row">
        <div>
          <p className="eyebrow">Privacidade</p>
          <h2>Seus dados e sua conta</h2>
        </div>
        <button className="settings-close-button" type="button" onClick={onClose}>
          Voltar
        </button>
      </div>

      <section className="privacy-hero-card">
        <span>Controle dos dados</span>
        <h3>As informações pertencem à família que as registrou</h3>
        <p>
          Compras, produtos, supermercados, categorias e históricos ficam
          separados por família. Somente membros ativos dessa família podem
          consultar os dados conforme suas permissões.
        </p>
      </section>

      <div className="privacy-grid">
        <article className="privacy-info-card">
          <span aria-hidden="true">▣</span>
          <div>
            <strong>Dados armazenados</strong>
            <p>
              Nome, e-mail, vínculo familiar e informações necessárias para o
              funcionamento do histórico de compras.
            </p>
          </div>
        </article>

        <article className="privacy-info-card">
          <span aria-hidden="true">⇩</span>
          <div>
            <strong>Exportação</strong>
            <p>
              Administradores podem baixar Excel e backup JSON em Ajustes antes
              de qualquer exclusão definitiva.
            </p>
          </div>
        </article>

        <article className="privacy-info-card">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>Compartilhamento</strong>
            <p>
              Os dados não são compartilhados entre famílias. Um usuário só vê
              as famílias das quais é membro ativo.
            </p>
          </div>
        </article>

        <article className="privacy-info-card">
          <span aria-hidden="true">⌫</span>
          <div>
            <strong>Exclusão</strong>
            <p>
              A conta pode ser apagada em Ajustes. Famílias vazias e seus dados
              são removidos; históricos compartilhados preservam apenas os
              registros sem identificar a conta excluída.
            </p>
          </div>
        </article>
      </div>

      <section className="privacy-actions-card">
        <div>
          <span>Ações da conta</span>
          <h3>Exportar ou excluir</h3>
          <p>
            Abra Ajustes para baixar uma cópia dos dados, alterar a senha ou
            acessar as opções de exclusão.
          </p>
        </div>
        <button className="capture-button compact-button" type="button" onClick={onOpenSettings}>
          Abrir Ajustes
        </button>
      </section>

      <section className="version-card">
        <div>
          <span>Aplicativo</span>
          <strong>v{APP_VERSION}</strong>
        </div>
        <div>
          <span>API</span>
          <strong>{apiVersion ? `v${apiVersion}` : "Verificando"}</strong>
        </div>
        <div>
          <span>Estágio</span>
          <strong>Preparação para beta</strong>
        </div>
      </section>
    </section>
  );
}
