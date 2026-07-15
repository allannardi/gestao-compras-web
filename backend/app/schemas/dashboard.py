from datetime import date

from pydantic import BaseModel, Field


class SupermercadoResumo(BaseModel):
    id: str
    nome: str
    cnpj: str = ""
    compras_count: int = Field(ge=0)
    valor_total: float = Field(ge=0)


class DashboardResumo(BaseModel):
    valor_total: float = Field(ge=0)
    compras_count: int = Field(ge=0)
    itens_count: int = Field(ge=0)
    ticket_medio: float = Field(ge=0)
    valor_mes_anterior: float = Field(ge=0)
    variacao_percentual: float | None = None


class DashboardTopProduto(BaseModel):
    id: str
    nome: str
    marca: str = ""
    unidade_padrao: str
    quantidade: float = Field(ge=0)
    valor_total: float = Field(ge=0)
    compras_count: int = Field(ge=0)


class DashboardTopCategoria(BaseModel):
    id: str
    nome: str
    valor_total: float = Field(ge=0)
    compras_count: int = Field(ge=0)
    produtos_count: int = Field(ge=0)


class DashboardTopSupermercado(BaseModel):
    id: str
    nome: str
    valor_total: float = Field(ge=0)
    compras_count: int = Field(ge=0)


class DashboardResponse(BaseModel):
    mes: date
    resumo: DashboardResumo
    top_produtos: list[DashboardTopProduto]
    top_categorias: list[DashboardTopCategoria]
    top_supermercados: list[DashboardTopSupermercado]


class HistoricoProdutoOpcao(BaseModel):
    id: str
    nome: str
    marca: str = ""
    unidade_padrao: str
    categoria_nome: str
    registros_count: int = Field(ge=0)
    ultima_compra: date | None = None
    ultimo_valor_unitario: float | None = Field(default=None, ge=0)


class HistoricoProdutoCabecalho(BaseModel):
    id: str
    nome: str
    marca: str = ""
    unidade_padrao: str
    categoria_nome: str


class HistoricoProdutoResumo(BaseModel):
    registros_count: int = Field(ge=0)
    menor_valor: float = Field(ge=0)
    maior_valor: float = Field(ge=0)
    primeiro_valor: float = Field(ge=0)
    ultimo_valor: float = Field(ge=0)
    variacao_percentual: float


class HistoricoPrecoPonto(BaseModel):
    id: str
    compra_id: str
    data_compra: date
    valor_unitario: float = Field(ge=0)
    quantidade: float = Field(gt=0)
    unidade: str
    supermercado_nome: str


class HistoricoProdutoResponse(BaseModel):
    produto: HistoricoProdutoCabecalho
    resumo: HistoricoProdutoResumo
    pontos: list[HistoricoPrecoPonto]
