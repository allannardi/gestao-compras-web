from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from starlette.concurrency import run_in_threadpool

from app.core.auth import SystemAdminContext, get_current_system_admin
from app.repositories.admin_geral import (
    SupabaseAdminGeralError,
    alterar_papel_membro_admin,
    alterar_status_familia_admin,
    atualizar_familia_admin,
    detalhar_familia_admin,
    detalhar_usuario_admin,
    excluir_familia_admin,
    excluir_usuario_admin,
    listar_auditoria_admin,
    listar_familias_admin,
    listar_usuarios_admin,
    obter_acesso_admin_geral,
    obter_resumo_admin_geral,
    remover_membro_admin,
    solicitar_redefinicao_senha_admin,
)
from app.schemas.admin_geral import (
    AdminAccessResponse,
    AdminActionResponse,
    AdminAuditoriaResponse,
    AdminFamiliaDetalhesResponse,
    AdminFamiliasResponse,
    AdminResumoResponse,
    AdminUsuarioDetalhesResponse,
    AdminUsuariosResponse,
    AlterarPapelMembroAdminRequest,
    AlterarStatusFamiliaAdminRequest,
    AtualizarFamiliaAdminRequest,
    ExcluirFamiliaAdminRequest,
    ExcluirUsuarioAdminRequest,
)

router = APIRouter(prefix="/admin-geral", tags=["Admin Geral"])


def _raise_http_error(exc: SupabaseAdminGeralError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


def _request_metadata(request: Request) -> tuple[str | None, str | None]:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    ip = forwarded or (request.client.host if request.client else None)
    request_id = request.headers.get("x-request-id")
    return ip, request_id


@router.get("/me", response_model=AdminAccessResponse)
async def admin_access(
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminAccessResponse:
    try:
        result = await run_in_threadpool(
            obter_acesso_admin_geral,
            context.access_token,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminAccessResponse(**result)


@router.get("/resumo", response_model=AdminResumoResponse)
async def admin_summary(
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminResumoResponse:
    try:
        result = await run_in_threadpool(
            obter_resumo_admin_geral,
            context.access_token,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminResumoResponse(**result)


@router.get("/familias", response_model=AdminFamiliasResponse)
async def admin_families(
    busca: str | None = Query(default=None, max_length=120),
    situacao: str | None = Query(default=None, max_length=20),
    limite: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminFamiliasResponse:
    try:
        result = await run_in_threadpool(
            listar_familias_admin,
            context.access_token,
            busca,
            situacao,
            limite,
            offset,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminFamiliasResponse(**result)


@router.get("/familias/{familia_id}", response_model=AdminFamiliaDetalhesResponse)
async def admin_family_detail(
    familia_id: UUID,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminFamiliaDetalhesResponse:
    try:
        result = await run_in_threadpool(
            detalhar_familia_admin,
            str(familia_id),
            context.access_token,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminFamiliaDetalhesResponse(**result)


@router.patch("/familias/{familia_id}", response_model=AdminActionResponse)
async def admin_update_family(
    familia_id: UUID,
    payload: AtualizarFamiliaAdminRequest,
    request: Request,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminActionResponse:
    ip, request_id = _request_metadata(request)
    try:
        result = await run_in_threadpool(
            atualizar_familia_admin,
            str(familia_id),
            payload.nome,
            payload.observacao,
            context.access_token,
            ip,
            request_id,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminActionResponse(**result)


@router.post("/familias/{familia_id}/suspender", response_model=AdminActionResponse)
async def admin_suspend_family(
    familia_id: UUID,
    payload: AlterarStatusFamiliaAdminRequest,
    request: Request,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminActionResponse:
    ip, request_id = _request_metadata(request)
    try:
        result = await run_in_threadpool(
            alterar_status_familia_admin,
            str(familia_id),
            "suspensa",
            payload.motivo,
            context.access_token,
            ip,
            request_id,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminActionResponse(**result)


@router.post("/familias/{familia_id}/reativar", response_model=AdminActionResponse)
async def admin_reactivate_family(
    familia_id: UUID,
    payload: AlterarStatusFamiliaAdminRequest,
    request: Request,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminActionResponse:
    ip, request_id = _request_metadata(request)
    try:
        result = await run_in_threadpool(
            alterar_status_familia_admin,
            str(familia_id),
            "ativa",
            payload.motivo,
            context.access_token,
            ip,
            request_id,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminActionResponse(**result)


@router.delete("/familias/{familia_id}", response_model=AdminActionResponse)
async def admin_delete_family(
    familia_id: UUID,
    payload: ExcluirFamiliaAdminRequest,
    request: Request,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminActionResponse:
    ip, request_id = _request_metadata(request)
    try:
        result = await run_in_threadpool(
            excluir_familia_admin,
            str(familia_id),
            payload.nome_confirmacao,
            payload.confirmacao,
            payload.motivo,
            context.access_token,
            ip,
            request_id,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminActionResponse(**result)


@router.get("/usuarios", response_model=AdminUsuariosResponse)
async def admin_users(
    busca: str | None = Query(default=None, max_length=120),
    limite: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminUsuariosResponse:
    try:
        result = await run_in_threadpool(
            listar_usuarios_admin,
            context.access_token,
            busca,
            limite,
            offset,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminUsuariosResponse(**result)


@router.get("/usuarios/{usuario_id}", response_model=AdminUsuarioDetalhesResponse)
async def admin_user_detail(
    usuario_id: UUID,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminUsuarioDetalhesResponse:
    try:
        result = await run_in_threadpool(
            detalhar_usuario_admin,
            str(usuario_id),
            context.access_token,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminUsuarioDetalhesResponse(**result)


@router.patch(
    "/familias/{familia_id}/membros/{usuario_id}",
    response_model=AdminActionResponse,
)
async def admin_update_member_role(
    familia_id: UUID,
    usuario_id: UUID,
    payload: AlterarPapelMembroAdminRequest,
    request: Request,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminActionResponse:
    ip, request_id = _request_metadata(request)
    try:
        result = await run_in_threadpool(
            alterar_papel_membro_admin,
            str(familia_id),
            str(usuario_id),
            payload.papel,
            context.access_token,
            ip,
            request_id,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminActionResponse(**result)


@router.delete(
    "/familias/{familia_id}/membros/{usuario_id}",
    response_model=AdminActionResponse,
)
async def admin_remove_member(
    familia_id: UUID,
    usuario_id: UUID,
    request: Request,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminActionResponse:
    ip, request_id = _request_metadata(request)
    try:
        result = await run_in_threadpool(
            remover_membro_admin,
            str(familia_id),
            str(usuario_id),
            context.access_token,
            ip,
            request_id,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminActionResponse(**result)


@router.post("/usuarios/{usuario_id}/redefinir-senha", response_model=AdminActionResponse)
async def admin_reset_password(
    usuario_id: UUID,
    request: Request,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminActionResponse:
    ip, request_id = _request_metadata(request)
    try:
        result = await run_in_threadpool(
            solicitar_redefinicao_senha_admin,
            str(usuario_id),
            context.access_token,
            ip,
            request_id,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminActionResponse(**result)


@router.delete("/usuarios/{usuario_id}", response_model=AdminActionResponse)
async def admin_delete_user(
    usuario_id: UUID,
    payload: ExcluirUsuarioAdminRequest,
    request: Request,
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminActionResponse:
    ip, request_id = _request_metadata(request)
    try:
        result = await run_in_threadpool(
            excluir_usuario_admin,
            str(usuario_id),
            payload.email_confirmacao,
            payload.confirmacao,
            payload.motivo,
            context.access_token,
            ip,
            request_id,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminActionResponse(**result)


@router.get("/auditoria", response_model=AdminAuditoriaResponse)
async def admin_audit(
    busca: str | None = Query(default=None, max_length=120),
    limite: int = Query(default=100, ge=1, le=300),
    offset: int = Query(default=0, ge=0),
    context: SystemAdminContext = Depends(get_current_system_admin),
) -> AdminAuditoriaResponse:
    try:
        result = await run_in_threadpool(
            listar_auditoria_admin,
            context.access_token,
            busca,
            limite,
            offset,
        )
    except SupabaseAdminGeralError as exc:
        _raise_http_error(exc)
    return AdminAuditoriaResponse(**result)
