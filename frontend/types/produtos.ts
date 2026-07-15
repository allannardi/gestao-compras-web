export type CategoriaResumo = {
  id: string;
  nome: string;
  sistema: boolean;
  ativo: boolean;
  produtos_count: number;
};

export type CategoriaCriada = {
  id: string;
  nome: string;
  mensagem: string;
};

export type ProdutoResumo = {
  id: string;
  nome: string;
  marca: string;
  unidade_padrao: string;
  revisar: boolean;
  categoria_id: string | null;
  categoria_nome: string;
  compras_count: number;
  ultima_compra: string | null;
  ultimo_valor_unitario: number | null;
  atualizado_em: string;
};

export type ProdutoLista = {
  produtos: ProdutoResumo[];
  total: number;
  para_revisar: number;
  classificados: number;
  filtrados: number;
  limite: number;
  offset: number;
  proximo_offset: number | null;
  tem_mais: boolean;
};

export type ProdutoUpdatePayload = {
  nome: string;
  marca: string;
  unidade_padrao: string;
  categoria_id: string;
};

export type ProdutoAtualizado = {
  id: string;
  nome: string;
  marca: string;
  unidade_padrao: string;
  revisar: boolean;
  categoria_id: string;
  categoria_nome: string;
  mensagem: string;
};

export type ReclassificacaoResultado = {
  classificados: number;
  pendentes: number;
  mensagem: string;
};
