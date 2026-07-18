from fastapi.testclient import TestClient

from app.api.v1.endpoints import exportacoes as endpoint
from app.core.auth import FamilyContext, get_current_family_context
from app.main import app

client = TestClient(app)


def _context(role: str = "administrador") -> FamilyContext:
    return FamilyContext(
        user_id="11111111-1111-4111-8111-111111111111",
        email="allan@example.com",
        nome="Allan",
        familia_id="22222222-2222-4222-8222-222222222222",
        familia_nome="Família Nardi",
        papel=role,
        access_token="token-123",
    )


def _summary() -> dict:
    return {
        "familia_id": "22222222-2222-4222-8222-222222222222",
        "familia_nome": "Família Nardi",
        "plano": "free",
        "gerado_em": "2026-07-18T10:00:00+00:00",
        "primeira_compra": "2026-07-01",
        "ultima_compra": "2026-07-17",
        "valor_total": 500.0,
        "compras_count": 3,
        "itens_count": 12,
        "produtos_count": 8,
        "historicos_count": 10,
        "supermercados_count": 2,
        "categorias_count": 12,
    }


def test_exportacoes_exigem_login() -> None:
    assert client.get("/api/v1/exportacoes/resumo").status_code == 401


def test_membro_nao_exporta() -> None:
    app.dependency_overrides[get_current_family_context] = lambda: _context("membro")
    try:
        response = client.get("/api/v1/exportacoes/resumo")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_obtem_resumo(monkeypatch) -> None:
    monkeypatch.setattr(endpoint, "obter_resumo_exportacao_familia", lambda token: _summary())
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get("/api/v1/exportacoes/resumo")
        assert response.status_code == 200
        assert response.json()["historicos_count"] == 10
    finally:
        app.dependency_overrides.clear()


def test_baixa_excel_e_backup(monkeypatch) -> None:
    monkeypatch.setattr(endpoint, "obter_backup_exportacao_familia", lambda token: {"familia": {"nome": "Família Nardi"}})
    monkeypatch.setattr(endpoint, "criar_excel_exportacao", lambda payload: (b"xlsx-content", "arquivo.xlsx"))
    monkeypatch.setattr(endpoint, "criar_backup_json", lambda payload: (b'{"ok":true}', "backup.json"))
    app.dependency_overrides[get_current_family_context] = _context
    try:
        excel = client.get("/api/v1/exportacoes/excel")
        backup = client.get("/api/v1/exportacoes/backup")
        assert excel.status_code == 200
        assert excel.content == b"xlsx-content"
        assert "arquivo.xlsx" in excel.headers["content-disposition"]
        assert backup.status_code == 200
        assert backup.json()["ok"] is True
        assert "backup.json" in backup.headers["content-disposition"]
    finally:
        app.dependency_overrides.clear()
