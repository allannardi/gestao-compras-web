export type ExclusaoContaResponse = {
  mensagem: string;
  familias_excluidas: number;
};

export type ExclusaoFamiliaResponse = {
  mensagem: string;
  familia_excluida_id: string;
  proxima_familia_id: string;
  proxima_familia_nome: string;
};
