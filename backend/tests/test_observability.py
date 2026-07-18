from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_request_id_is_returned() -> None:
    response = client.get("/health", headers={"X-Request-ID": "beta-test-1234"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "beta-test-1234"
    assert float(response.headers["x-response-time-ms"]) >= 0


def test_invalid_request_id_is_replaced() -> None:
    response = client.get("/health", headers={"X-Request-ID": "x"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] != "x"
    assert len(response.headers["x-request-id"]) >= 8


def test_ready_does_not_expose_keys() -> None:
    response = client.get("/ready")
    payload = response.json()

    assert response.status_code == 200
    assert "supabase_configured" in payload
    assert "admin_actions_configured" in payload
    assert "key" not in str(payload).lower()
