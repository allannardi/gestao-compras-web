from datetime import date, datetime

from pydantic import BaseModel, Field


class ExportacaoResumoResponse(BaseModel):
    familia_id: str
    familia_nome: str
    plano: str
    gerado_em: datetime
    primeira_compra: date | None = None
    ultima_compra: date | None = None
    valor_total: float = Field(ge=0)
    compras_count: int = Field(ge=0)
    itens_count: int = Field(ge=0)
    produtos_count: int = Field(ge=0)
    historicos_count: int = Field(ge=0)
    supermercados_count: int = Field(ge=0)
    categorias_count: int = Field(ge=0)
