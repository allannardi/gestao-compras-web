export type PerfilConfiguracao = {
  id: string;
  nome: string;
  email: string;
};

export type FamiliaConfiguracao = {
  id: string;
  nome: string;
  plano: string;
  status: string;
  papel: "administrador" | "membro" | string;
  membros_count: number;
  limite_usuarios: number;
};

export type FamiliaDisponivel = {
  id: string;
  nome: string;
  papel: "administrador" | "membro" | string;
  atual: boolean;
};

export type MembroFamilia = {
  usuario_id: string;
  nome: string;
  email: string;
  papel: "administrador" | "membro" | string;
  status: string;
  criado_em: string;
  atual: boolean;
};

export type ConviteEnviado = {
  id: string;
  email: string;
  papel: "administrador" | "membro" | string;
  status: string;
  expira_em: string;
  criado_em: string;
};

export type ConviteRecebido = {
  id: string;
  familia_id: string;
  familia_nome: string;
  papel: "administrador" | "membro" | string;
  expira_em: string;
  convidado_por_nome: string;
};

export type ConfiguracoesData = {
  perfil: PerfilConfiguracao;
  familia: FamiliaConfiguracao;
  familias_disponiveis: FamiliaDisponivel[];
  membros: MembroFamilia[];
  convites_enviados: ConviteEnviado[];
  convites_recebidos: ConviteRecebido[];
};

export type MensagemResponse = {
  mensagem: string;
};

export type ConviteCriadoResponse = MensagemResponse & {
  id: string;
  email: string;
  papel: "administrador" | "membro" | string;
  status: string;
  token: string;
  expira_em: string;
};
