from pydantic import BaseModel, Field


class NfceItemPreview(BaseModel):
    descricao_original: str
    quantidade: float = Field(ge=0)
    unidade: str = "un"
    valor_unitario: float = Field(ge=0)
    valor_total: float = Field(ge=0)


class NfcePreviewResponse(BaseModel):
    ok: bool
    mensagem: str
    qr_texto: str
    chave_nfce: str = ""
    mercado_nome: str = ""
    cnpj: str = ""
    data_compra: str = ""
    valor_total: float = 0.0
    forma_pagamento: str = ""
    valor_pago: float = 0.0
    itens: list[NfceItemPreview] = Field(default_factory=list)
    html_obtido: bool = False
