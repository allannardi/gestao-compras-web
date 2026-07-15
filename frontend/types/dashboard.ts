export type SupermercadoResumo = {
  id: string;
  nome: string;
  cnpj: string;
  compras_count: number;
  valor_total: number;
};

export type DashboardResumo = {
  valor_total: number;
  compras_count: number;
  itens_count: number;
  ticket_medio: number;
  valor_mes_anterior: number;
  variacao_percentual: number | null;
};

export type DashboardTopProduto = {
  id: string;
  nome: string;
  marca: string;
  unidade_padrao: string;
  quantidade: number;
  valor_total: number;
  compras_count: number;
};

export type DashboardTopCategoria = {
  id: string;
  nome: string;
  valor_total: number;
  compras_count: number;
  produtos_count: number;
};

export type DashboardTopSupermercado = {
  id: string;
  nome: string;
  valor_total: number;
  compras_count: number;
};

export type DashboardData = {
  mes: string;
  resumo: DashboardResumo;
  top_produtos: DashboardTopProduto[];
  top_categorias: DashboardTopCategoria[];
  top_supermercados: DashboardTopSupermercado[];
};

export type HistoricoProdutoOpcao = {
  id: string;
  nome: string;
  marca: string;
  unidade_padrao: string;
  categoria_nome: string;
  registros_count: number;
  ultima_compra: string | null;
  ultimo_valor_unitario: number | null;
};

export type HistoricoProdutoCabecalho = {
  id: string;
  nome: string;
  marca: string;
  unidade_padrao: string;
  categoria_nome: string;
};

export type HistoricoProdutoResumo = {
  registros_count: number;
  menor_valor: number;
  maior_valor: number;
  primeiro_valor: number;
  ultimo_valor: number;
  variacao_percentual: number;
};

export type HistoricoPrecoPonto = {
  id: string;
  compra_id: string;
  data_compra: string;
  valor_unitario: number;
  quantidade: number;
  unidade: string;
  supermercado_nome: string;
};

export type HistoricoProdutoData = {
  produto: HistoricoProdutoCabecalho;
  resumo: HistoricoProdutoResumo;
  pontos: HistoricoPrecoPonto[];
};
