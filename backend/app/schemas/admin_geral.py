from typing import Any, Literal

from pydantic import BaseModel, Field


class AdminAccessResponse(BaseModel):
    admin_geral: bool
    usuario_id: str | None = None
    nome: str | None = None
    email: str | None = None


class AdminResumoResponse(BaseModel):
    familias_total: int = Field(ge=0)
    familias_ativas: int = Field(ge=0)
    familias_suspensas: int = Field(ge=0)
    familias_novas_30_dias: int = Field(ge=0)
    usuarios_total: int = Field(ge=0)
    membros_ativos: int = Field(ge=0)
    compras_total: int = Field(ge=0)
    itens_total: int = Field(ge=0)
    produtos_total: int = Field(ge=0)
    supermercados_total: int = Field(ge=0)
    administradores_sistema: int = Field(ge=0)
    gerado_em: str
    administrador_id: str


class AdminListResponse(BaseModel):
    total: int = Field(ge=0)
    limite: int = Field(ge=1)
    offset: int = Field(ge=0)
    tem_mais: bool
    administrador_id: str


class AdminFamiliasResponse(AdminListResponse):
    familias: list[dict[str, Any]]


class AdminUsuariosResponse(AdminListResponse):
    usuarios: list[dict[str, Any]]


class AdminAuditoriaResponse(AdminListResponse):
    registros: list[dict[str, Any]]


class AdminFamiliaDetalhesResponse(BaseModel):
    familia: dict[str, Any]
    membros: list[dict[str, Any]]
    administrador_id: str


class AdminUsuarioDetalhesResponse(BaseModel):
    usuario: dict[str, Any]
    familias: list[dict[str, Any]]
    administrador_id: str


class AtualizarFamiliaAdminRequest(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=80)
    observacao: str | None = Field(default=None, max_length=1000)


class AlterarStatusFamiliaAdminRequest(BaseModel):
    motivo: str = Field(min_length=3, max_length=500)


class ExcluirFamiliaAdminRequest(BaseModel):
    nome_confirmacao: str = Field(min_length=2, max_length=80)
    confirmacao: Literal["EXCLUIR DEFINITIVAMENTE"]
    motivo: str = Field(min_length=3, max_length=500)


class AlterarPapelMembroAdminRequest(BaseModel):
    papel: Literal["administrador", "membro"]


class ExcluirUsuarioAdminRequest(BaseModel):
    email_confirmacao: str = Field(min_length=5, max_length=254)
    confirmacao: Literal["EXCLUIR DEFINITIVAMENTE"]
    motivo: str = Field(min_length=3, max_length=500)


class AdminActionResponse(BaseModel):
    mensagem: str
    familia_id: str | None = None
    usuario_id: str | None = None
    status: str | None = None
    papel: str | None = None
    nome: str | None = None
    observacao_admin: str | None = None
    familia_nome: str | None = None
    usuarios_sem_familia: int | None = None
    resumo_excluido: dict[str, Any] | None = None
    proxima_familia_id: str | None = None
