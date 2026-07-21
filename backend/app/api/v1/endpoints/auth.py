from fastapi import APIRouter, Depends

from app.core.auth import FamilyContext, get_current_family_context
from app.schemas.auth import AuthContextResponse

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.get("/me", response_model=AuthContextResponse)
def read_current_user(
    context: FamilyContext = Depends(get_current_family_context),
) -> AuthContextResponse:
    return AuthContextResponse(
        user_id=context.user_id,
        email=context.email,
        nome=context.nome,
        familia_id=context.familia_id,
        familia_nome=context.familia_nome,
        papel=context.papel,
        familia_status=context.familia_status,
    )
