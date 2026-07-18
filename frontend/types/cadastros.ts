export type CategoriaCadastro = {
  id: string;
  nome: string;
  sistema: boolean;
  ativo: boolean;
  produtos_count: number;
};

export type SupermercadoCadastro = {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
  compras_count: number;
  valor_total: number;
  ultima_compra: string | null;
};

export type CadastrosResumo = {
  categorias_ativas: number;
  categorias_personalizadas: number;
  produtos_classificados: number;
  supermercados_ativos: number;
  compras_com_supermercado: number;
};

export type CadastrosData = {
  categorias: CategoriaCadastro[];
  supermercados: SupermercadoCadastro[];
  resumo: CadastrosResumo;
  pode_editar: boolean;
};

export type CategoriaAtualizada = {
  id: string;
  nome: string;
  sistema: boolean;
  ativo: boolean;
  produtos_movidos: number;
  mensagem: string;
};

export type SupermercadoAtualizado = {
  id: string;
  nome: string;
  cnpj: string;
  compras_movidas: number;
  historicos_movidos: number;
  mensagem: string;
};
