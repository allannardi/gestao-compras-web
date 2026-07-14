export type CompraSalva = {
  compra_id: string;
  familia_id: string;
  supermercado_id: string;
  itens_salvos: number;
  produtos_criados: number;
  produtos_reutilizados: number;
  mensagem: string;
};

export type CompraExcluida = {
  compra_id: string;
  familia_id: string;
  itens_excluidos: number;
  historicos_excluidos: number;
  mensagem: string;
};

export type CompraResumo = {
  id: string;
  supermercado_nome: string;
  data_compra: string;
  valor_total: number;
  forma_pagamento: string;
  status: string;
  itens_count: number;
  criado_em: string;
};

export type CompraLista = {
  compras: CompraResumo[];
  limite: number;
  offset: number;
  proximo_offset: number | null;
  tem_mais: boolean;
};

export type CompraItemDetalhe = {
  id: string;
  produto_id: string | null;
  produto_nome: string;
  descricao_original: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  categoria_nome: string;
};

export type CompraDetalhe = {
  id: string;
  familia_id: string;
  supermercado_id: string | null;
  supermercado_nome: string;
  supermercado_cnpj: string;
  chave_nfce: string;
  data_compra: string;
  valor_total: number;
  forma_pagamento: string;
  valor_pago: number;
  origem: string;
  status: string;
  criado_em: string;
  itens: CompraItemDetalhe[];
};
