from datetime import datetime

from pydantic import BaseModel, Field


class ConvitePublicoResponse(BaseModel):
    id: str
    familia_id: str
    familia_nome: str
    email: str
    papel: str
    expira_em: datetime
    convidado_por_nome: str


class AceitarConviteTokenRequest(BaseModel):
    token: str = Field(min_length=32, max_length=256)


class ConviteAceitoResponse(BaseModel):
    familia_id: str
    mensagem: str
