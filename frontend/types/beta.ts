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
