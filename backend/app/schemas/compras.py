from datetime import date
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


class CompraItemCreate(BaseModel):
    descricao_original: Annotated[str, Field(min_length=1, max_length=240)]
    quantidade: float = Field(gt=0, le=1_000_000)
    unidade: Annotated[str, Field(min_length=1, max_length=20)] = "un"
    valor_unitario: float = Field(ge=0, le=100_000_000)
    valor_total: float = Field(ge=0, le=100_000_000)

    @field_validator("descricao_original", "unidade")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return " ".join(value.split())


class CompraNfceCreate(BaseModel):
    qr_texto: Annotated[str, Field(min_length=8, max_length=4_000)]
    chave_nfce: Annotated[str, Field(max_length=60)] = ""
    mercado_nome: Annotated[str, Field(min_length=2, max_length=160)]
    cnpj: Annotated[str, Field(max_length=30)] = ""
    data_compra: date
    valor_total: float = Field(gt=0, le=100_000_000)
    forma_pagamento: Annotated[str, Field(max_length=100)] = ""
    valor_pago: float = Field(ge=0, le=100_000_000)
    itens: list[CompraItemCreate] = Field(min_length=1, max_length=500)

    @field_validator("chave_nfce")
    @classmethod
    def normalize_key(cls, value: str) -> str:
        digits = "".join(character for character in value if character.isdigit())
        return digits if len(digits) == 44 else ""

    @field_validator("mercado_nome", "forma_pagamento", "cnpj")
    @classmethod
    def strip_fields(cls, value: str) -> str:
        return " ".join(value.split())


class CompraCreateResponse(BaseModel):
    compra_id: str
    familia_id: str
    supermercado_id: str
    itens_salvos: int = Field(ge=1)
    produtos_criados: int = Field(ge=0)
    produtos_reutilizados: int = Field(ge=0)
    mensagem: str
