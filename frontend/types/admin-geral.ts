export type AdminAccess = {
  admin_geral: boolean;
  usuario_id?: string;
  nome?: string;
  email?: string;
};

export type AdminResumo = {
  familias_total: number;
  familias_ativas: number;
  familias_suspensas: number;
  familias_novas_30_dias: number;
  usuarios_total: number;
  membros_ativos: number;
  compras_total: number;
  itens_total: number;
  produtos_total: number;
  supermercados_total: number;
  administradores_sistema: number;
  gerado_em: string;
};

export type AdminFamiliaResumo = {
  id: string;
  nome: string;
  status: string;
  observacao_admin: string;
  criado_em: string;
  atualizado_em: string;
  ultima_atividade?: string | null;
  membros_count: number;
  administradores_count: number;
  compras_count: number;
  produtos_count: number;
  itens_count: number;
  administrador_nome: string;
  administrador_email: string;
};

export type AdminMembro = {
  usuario_id: string;
  nome: string;
  email: string;
  papel: string;
  status: string;
  criado_em: string;
  familia_atual: boolean;
  admin_geral: boolean;
};

export type AdminFamiliaDetalhes = {
  familia: AdminFamiliaResumo & {
    supermercados_count: number;
    suspensa_em?: string | null;
  };
  membros: AdminMembro[];
};

export type AdminUsuarioResumo = {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
  atualizado_em: string;
  familia_atual_id?: string | null;
  familia_atual_nome: string;
  familia_atual_status: string;
  admin_geral: boolean;
  familias_count: number;
  ultima_atividade?: string | null;
};

export type AdminUsuarioFamilia = {
  familia_id: string;
  familia_nome: string;
  familia_status: string;
  papel: string;
  status: string;
  criado_em: string;
  familia_atual: boolean;
};

export type AdminUsuarioDetalhes = {
  usuario: AdminUsuarioResumo;
  familias: AdminUsuarioFamilia[];
};

export type AdminAuditoriaRegistro = {
  id: string;
  acao: string;
  entidade: string;
  entidade_id?: string | null;
  familia_id?: string | null;
  usuario_alvo_id?: string | null;
  resumo: string;
  dados_anteriores: Record<string, unknown>;
  dados_novos: Record<string, unknown>;
  origem_ip?: string | null;
  request_id?: string | null;
  criado_em: string;
  administrador_nome: string;
  administrador_email: string;
};

export type Paginated<T, K extends string> = {
  total: number;
  limite: number;
  offset: number;
  tem_mais: boolean;
} & Record<K, T[]>;

export type AdminFamiliasLista = Paginated<AdminFamiliaResumo, "familias">;
export type AdminUsuariosLista = Paginated<AdminUsuarioResumo, "usuarios">;
export type AdminAuditoriaLista = Paginated<AdminAuditoriaRegistro, "registros">;

export type AdminAction = {
  mensagem: string;
  familia_id?: string;
  usuario_id?: string;
  status?: string;
  papel?: string;
  nome?: string;
  observacao_admin?: string;
  familia_nome?: string;
  usuarios_sem_familia?: number;
  proxima_familia_id?: string | null;
};
