export type FamilyContext = {
  user_id: string;
  email: string;
  nome: string;
  familia_id: string;
  familia_nome: string;
  papel: "administrador" | "membro" | string;
};
