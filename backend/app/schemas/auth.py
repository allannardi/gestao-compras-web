from pydantic import BaseModel


class AuthContextResponse(BaseModel):
    user_id: str
    email: str
    nome: str
    familia_id: str
    familia_nome: str
    papel: str
