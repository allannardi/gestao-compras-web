from pydantic import BaseModel, Field


class ExcluirContaRequest(BaseModel):
    email_confirmacao: str = Field(min_length=5, max_length=254)


class ExcluirContaResponse(BaseModel):
    mensagem: str
    familias_excluidas: int = Field(ge=0)


class ExcluirFamiliaRequest(BaseModel):
    nome_confirmacao: str = Field(min_length=2, max_length=80)


class ExcluirFamiliaResponse(BaseModel):
    mensagem: str
    familia_excluida_id: str
    proxima_familia_id: str
    proxima_familia_nome: str
