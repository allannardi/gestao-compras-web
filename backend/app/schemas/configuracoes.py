from datetime import datetime

from pydantic import BaseModel, Field


class PerfilConfiguracao(BaseModel):
    id: str
    nome: str
    email: str


class FamiliaConfiguracao(BaseModel):
    id: str
    nome: str
    plano: str
    status: str
    papel: str
    membros_count: int = Field(ge=0)
    limite_usuarios: int = Field(gt=0)


class FamiliaDisponivel(BaseModel):
    id: str
    nome: str
    papel: str
    atual: bool


class MembroFamilia(BaseModel):
    usuario_id: str
    nome: str
    email: str
    papel: str
    status: str
    criado_em: datetime
    atual: bool


class ConviteEnviado(BaseModel):
    id: str
    email: str
    papel: str
    status: str
    expira_em: datetime
    criado_em: datetime


class ConviteRecebido(BaseModel):
    id: str
    familia_id: str
    familia_nome: str
    papel: str
    expira_em: datetime
    convidado_por_nome: str


class ConfiguracoesResponse(BaseModel):
    perfil: PerfilConfiguracao
    familia: FamiliaConfiguracao
    familias_disponiveis: list[FamiliaDisponivel]
    membros: list[MembroFamilia]
    convites_enviados: list[ConviteEnviado]
    convites_recebidos: list[ConviteRecebido]


class AtualizarPerfilRequest(BaseModel):
    nome: str = Field(min_length=2, max_length=100)


class AtualizarFamiliaRequest(BaseModel):
    nome: str = Field(min_length=2, max_length=80)


class CriarConviteRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    papel: str = Field(default="membro", pattern="^(administrador|membro)$")


class AtualizarPapelRequest(BaseModel):
    papel: str = Field(pattern="^(administrador|membro)$")


class MensagemResponse(BaseModel):
    mensagem: str


class ConviteCriadoResponse(MensagemResponse):
    id: str
    email: str
    papel: str
    status: str
    expira_em: datetime


class FamiliaSelecionadaResponse(MensagemResponse):
    familia_id: str
    familia_nome: str | None = None
