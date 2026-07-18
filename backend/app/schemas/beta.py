from datetime import datetime
from typing import Literal

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


class AceiteLegalStatusResponse(BaseModel):
    aceito: bool
    termos_versao_atual: str
    privacidade_versao_atual: str
    termos_versao_aceita: str | None = None
    privacidade_versao_aceita: str | None = None
    aceito_em: datetime | None = None


class RegistrarAceiteLegalRequest(BaseModel):
    termos_versao: str = Field(min_length=1, max_length=20)
    privacidade_versao: str = Field(min_length=1, max_length=20)


class AceiteLegalRegistradoResponse(BaseModel):
    mensagem: str
    termos_versao: str
    privacidade_versao: str
    aceito_em: datetime


class TelemetriaTecnicaRequest(BaseModel):
    evento: Literal[
        "frontend_error",
        "api_indisponivel",
        "pwa_atualizacao_falhou",
        "contexto_familia_falhou",
    ]
    pagina: str = Field(default="/", min_length=1, max_length=80)
    app_version: str = Field(min_length=1, max_length=20)
    codigo: str = Field(min_length=1, max_length=80)
    request_id: str | None = Field(default=None, max_length=64)


class TelemetriaTecnicaResponse(BaseModel):
    recebido: bool
