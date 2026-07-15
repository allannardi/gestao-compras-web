from datetime import date, datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CategoriaResumo(BaseModel):
    id: str
    nome: str
    sistema: bool
    ativo: bool
    produtos_count: int = Field(ge=0)


class CategoriaCreate(BaseModel):
    nome: Annotated[str, Field(min_length=2, max_length=80)]

    @field_validator("nome")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return " ".join(value.split())


class CategoriaCreateResponse(BaseModel):
    id: str
    nome: str
    mensagem: str


class ProdutoResumo(BaseModel):
    id: str
    nome: str
    marca: str = ""
    unidade_padrao: str
    revisar: bool
    categoria_id: str | None = None
    categoria_nome: str
    compras_count: int = Field(ge=0)
    ultima_compra: date | None = None
    ultimo_valor_unitario: float | None = Field(default=None, ge=0)
    atualizado_em: datetime


class ProdutoListaResponse(BaseModel):
    produtos: list[ProdutoResumo]
    total: int = Field(ge=0)
    para_revisar: int = Field(ge=0)
    classificados: int = Field(ge=0)
    filtrados: int = Field(ge=0)
    limite: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
    proximo_offset: int | None = Field(default=None, ge=0)
    tem_mais: bool


class ProdutoUpdate(BaseModel):
    nome: Annotated[str, Field(min_length=1, max_length=240)]
    marca: Annotated[str, Field(max_length=100)] = ""
    unidade_padrao: Annotated[str, Field(min_length=1, max_length=20)] = "un"
    categoria_id: UUID

    @field_validator("nome", "marca", "unidade_padrao")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("unidade_padrao")
    @classmethod
    def normalize_unit(cls, value: str) -> str:
        return value.lower()


class ProdutoUpdateResponse(BaseModel):
    id: str
    nome: str
    marca: str = ""
    unidade_padrao: str
    revisar: bool
    categoria_id: UUID
    categoria_nome: str
    mensagem: str


class ReclassificacaoResponse(BaseModel):
    classificados: int = Field(ge=0)
    pendentes: int = Field(ge=0)
    mensagem: str
