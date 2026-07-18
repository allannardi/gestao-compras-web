from datetime import date
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CategoriaCadastro(BaseModel):
    id: str
    nome: str
    sistema: bool
    ativo: bool
    produtos_count: int = Field(ge=0)


class SupermercadoCadastro(BaseModel):
    id: str
    nome: str
    cnpj: str = ""
    ativo: bool
    compras_count: int = Field(ge=0)
    valor_total: float = Field(ge=0)
    ultima_compra: date | None = None


class CadastrosResumo(BaseModel):
    categorias_ativas: int = Field(ge=0)
    categorias_personalizadas: int = Field(ge=0)
    produtos_classificados: int = Field(ge=0)
    supermercados_ativos: int = Field(ge=0)
    compras_com_supermercado: int = Field(ge=0)


class CadastrosResponse(BaseModel):
    categorias: list[CategoriaCadastro]
    supermercados: list[SupermercadoCadastro]
    resumo: CadastrosResumo
    pode_editar: bool


class AtualizarCategoriaRequest(BaseModel):
    nome: Annotated[str, Field(min_length=2, max_length=80)]

    @field_validator("nome")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return " ".join(value.split())


class AtualizarSupermercadoRequest(BaseModel):
    nome: Annotated[str, Field(min_length=2, max_length=160)]

    @field_validator("nome")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return " ".join(value.split())


class DesativarCategoriaRequest(BaseModel):
    categoria_destino_id: UUID


class MesclarSupermercadoRequest(BaseModel):
    supermercado_destino_id: UUID
    confirmacao: str = Field(pattern="^UNIR$")


class CadastroMensagemResponse(BaseModel):
    mensagem: str


class CategoriaAtualizadaResponse(CadastroMensagemResponse):
    id: str
    nome: str
    sistema: bool
    ativo: bool
    produtos_movidos: int = Field(default=0, ge=0)


class SupermercadoAtualizadoResponse(CadastroMensagemResponse):
    id: str
    nome: str
    cnpj: str = ""
    compras_movidas: int = Field(default=0, ge=0)
    historicos_movidos: int = Field(default=0, ge=0)
