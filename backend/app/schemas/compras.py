from datetime import date, datetime
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




class CompraDeleteRequest(BaseModel):
    confirmacao: Annotated[str, Field(min_length=7, max_length=20)]

    @field_validator("confirmacao")
    @classmethod
    def normalize_confirmation(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized != "EXCLUIR":
            raise ValueError("Digite EXCLUIR para confirmar a exclusão.")
        return normalized


class CompraDeleteResponse(BaseModel):
    compra_id: str
    familia_id: str
    itens_excluidos: int = Field(ge=0)
    historicos_excluidos: int = Field(ge=0)
    mensagem: str


class CompraResumo(BaseModel):
    id: str
    supermercado_nome: str
    data_compra: date
    valor_total: float = Field(ge=0)
    forma_pagamento: str = ""
    status: str
    itens_count: int = Field(ge=0)
    criado_em: datetime


class CompraListaResponse(BaseModel):
    compras: list[CompraResumo]
    limite: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
    proximo_offset: int | None = Field(default=None, ge=0)
    tem_mais: bool


class CompraItemDetalhe(BaseModel):
    id: str
    produto_id: str | None = None
    produto_nome: str
    descricao_original: str
    quantidade: float = Field(gt=0)
    unidade: str
    valor_unitario: float = Field(ge=0)
    valor_total: float = Field(ge=0)
    categoria_nome: str


class CompraDetalheResponse(BaseModel):
    id: str
    familia_id: str
    supermercado_id: str | None = None
    supermercado_nome: str
    supermercado_cnpj: str = ""
    chave_nfce: str = ""
    data_compra: date
    valor_total: float = Field(ge=0)
    forma_pagamento: str = ""
    valor_pago: float = Field(ge=0)
    origem: str
    status: str
    criado_em: datetime
    itens: list[CompraItemDetalhe]
