export type NfceItem = {
  descricao_original: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
};

export type NfcePreview = {
  ok: boolean;
  mensagem: string;
  qr_texto: string;
  chave_nfce: string;
  mercado_nome: string;
  cnpj: string;
  data_compra: string;
  valor_total: number;
  forma_pagamento: string;
  valor_pago: number;
  itens: NfceItem[];
  html_obtido: boolean;
};
