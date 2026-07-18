import Link from "next/link";

import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/version";

type Props = {
  type: "terms" | "privacy";
};

export function LegalDocument({ type }: Props) {
  const isTerms = type === "terms";

  return (
    <article className="legal-page-card">
      <div className="legal-page-heading">
        <div>
          <p className="eyebrow">Gestão de Compras</p>
          <h1>{isTerms ? "Termos do beta" : "Aviso de Privacidade"}</h1>
          <p>
            Versão {isTerms ? TERMS_VERSION : PRIVACY_VERSION} · Atualizado em
            18/07/2026
          </p>
        </div>
        <Link className="settings-close-button" href="/">
          Voltar
        </Link>
      </div>

      {isTerms ? (
        <div className="legal-copy">
          <section>
            <h2>1. Finalidade do beta</h2>
            <p>
              O Gestão de Compras está em beta controlado. Ele permite registrar
              compras, produtos, preços e informações compartilhadas por uma
              família. Durante o beta podem ocorrer ajustes, indisponibilidades e
              mudanças de funcionamento.
            </p>
          </section>
          <section>
            <h2>2. Responsabilidade pelo acesso</h2>
            <p>
              Cada pessoa deve proteger sua senha e utilizar dados verdadeiros. O
              administrador da família controla convites, permissões, exportações
              e exclusões disponíveis no aplicativo.
            </p>
          </section>
          <section>
            <h2>3. Conteúdo registrado</h2>
            <p>
              Os usuários são responsáveis por conferir dados extraídos de
              NFC-e, categorias, nomes de produtos, valores e demais registros
              antes de utilizá-los em decisões pessoais.
            </p>
          </section>
          <section>
            <h2>4. Disponibilidade e mudanças</h2>
            <p>
              Não há garantia de funcionamento ininterrupto durante o beta. As
              funcionalidades podem ser corrigidas, ampliadas ou removidas para
              melhorar segurança, desempenho e usabilidade.
            </p>
          </section>
          <section>
            <h2>5. Uso adequado</h2>
            <p>
              Não é permitido tentar acessar famílias de terceiros, contornar
              permissões, automatizar abuso do serviço ou utilizar o aplicativo
              para atividade ilegal.
            </p>
          </section>
          <section>
            <h2>6. Encerramento</h2>
            <p>
              O usuário pode exportar seus dados e solicitar exclusão pelas
              opções disponíveis. O acesso também poderá ser suspenso em caso de
              abuso, risco de segurança ou encerramento do beta.
            </p>
          </section>
        </div>
      ) : (
        <div className="legal-copy">
          <section>
            <h2>1. Dados tratados</h2>
            <p>
              O aplicativo utiliza nome, e-mail, vínculo com famílias, dados de
              autenticação e informações de compras registradas, como produtos,
              preços, supermercados, categorias e datas.
            </p>
          </section>
          <section>
            <h2>2. Finalidades</h2>
            <p>
              Os dados são usados para autenticar usuários, separar famílias,
              registrar compras, gerar históricos, permitir exportações, manter
              segurança e diagnosticar falhas técnicas sem registrar o conteúdo
              dos itens na telemetria.
            </p>
          </section>
          <section>
            <h2>3. Compartilhamento</h2>
            <p>
              Membros ativos da mesma família visualizam os dados compartilhados
              desse espaço. Os dados técnicos são processados pelos provedores de
              hospedagem, autenticação e banco necessários ao funcionamento.
            </p>
          </section>
          <section>
            <h2>4. Controle e direitos</h2>
            <p>
              O usuário pode corrigir seu perfil, alterar senha, exportar dados e
              solicitar exclusão. O administrador pode gerenciar a família e
              seus membros conforme as regras do aplicativo.
            </p>
          </section>
          <section>
            <h2>5. Segurança e retenção</h2>
            <p>
              São utilizadas autenticação, permissões por família e regras de
              acesso no banco. Os dados permanecem enquanto a conta ou família
              estiver ativa, observadas as exclusões e preservações de históricos
              compartilhados descritas no aplicativo.
            </p>
          </section>
          <section>
            <h2>6. Alterações deste aviso</h2>
            <p>
              Quando uma nova versão exigir novo aceite, o aplicativo apresentará
              os documentos atualizados antes de liberar o acesso.
            </p>
          </section>
        </div>
      )}

      <footer className="legal-page-footer">
        <Link href={isTerms ? "/politica-de-privacidade" : "/termos"}>
          {isTerms ? "Ler Aviso de Privacidade" : "Ler Termos do beta"}
        </Link>
      </footer>
    </article>
  );
}
