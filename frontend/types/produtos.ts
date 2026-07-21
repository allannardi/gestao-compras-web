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

export type ProdutoMesclagemResumo = {
  id: string;
  nome: string;
  marca: string;
  unidade_padrao: string;
  categoria_nome: string;
  compras_count: number;
  registros_precos_count: number;
  quantidade_total: number;
  ultima_compra: string | null;
  aliases_count: number;
};

export type ProdutoCandidatosMesclagem = {
  produto_principal: ProdutoMesclagemResumo;
  candidatos: ProdutoMesclagemResumo[];
  limite: number;
  busca: string;
};

export type ProdutoMesclagemResultado = {
  mesclagem_id: string;
  produto_principal_id: string;
  produto_incorporado_id: string;
  produto_principal_nome: string;
  produto_incorporado_nome: string;
  itens_transferidos: number;
  historicos_transferidos: number;
  aliases_ativos: number;
  mensagem: string;
};
