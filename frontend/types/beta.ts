export type OnboardingBeta = {
  mostrar: boolean;
  concluido_em: string | null;
  papel: string;
  compras_count: number;
  produtos_count: number;
  produtos_revisar_count: number;
  membros_count: number;
  primeira_compra_concluida: boolean;
  revisao_produtos_concluida: boolean;
  membro_adicional_concluido: boolean;
  etapas_principais_concluidas: boolean;
};

export type OnboardingConcluido = {
  mensagem: string;
  concluido_em: string;
};

export type PrivacidadeRegistrada = {
  mensagem: string;
  visto_em: string;
};

export type AceiteLegalStatus = {
  aceito: boolean;
  termos_versao_atual: string;
  privacidade_versao_atual: string;
  termos_versao_aceita: string | null;
  privacidade_versao_aceita: string | null;
  aceito_em: string | null;
};

export type AceiteLegalRegistrado = {
  mensagem: string;
  termos_versao: string;
  privacidade_versao: string;
  aceito_em: string;
};

export type EventoTecnico =
  | "frontend_error"
  | "api_indisponivel"
  | "pwa_atualizacao_falhou"
  | "contexto_familia_falhou";
