export type ConvitePublico = {
  id: string;
  familia_id: string;
  familia_nome: string;
  email: string;
  papel: "administrador" | "membro" | string;
  expira_em: string;
  convidado_por_nome: string;
};

export type ConviteAceito = {
  familia_id: string;
  mensagem: string;
};
