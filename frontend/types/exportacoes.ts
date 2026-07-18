export type ExportacaoResumo = {
  familia_id: string;
  familia_nome: string;
  plano: string;
  gerado_em: string;
  primeira_compra: string | null;
  ultima_compra: string | null;
  valor_total: number;
  compras_count: number;
  itens_count: number;
  produtos_count: number;
  historicos_count: number;
  supermercados_count: number;
  categorias_count: number;
};
