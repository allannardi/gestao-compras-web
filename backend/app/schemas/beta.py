from datetime import datetime

from pydantic import BaseModel, Field


class OnboardingBetaResponse(BaseModel):
    mostrar: bool
    concluido_em: datetime | None = None
    papel: str
    compras_count: int = Field(ge=0)
    produtos_count: int = Field(ge=0)
    produtos_revisar_count: int = Field(ge=0)
    membros_count: int = Field(ge=0)
    primeira_compra_concluida: bool
    revisao_produtos_concluida: bool
    membro_adicional_concluido: bool
    etapas_principais_concluidas: bool


class OnboardingConcluidoResponse(BaseModel):
    mensagem: str
    concluido_em: datetime


class PrivacidadeRegistradaResponse(BaseModel):
    mensagem: str
    visto_em: datetime
