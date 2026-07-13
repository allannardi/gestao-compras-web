from fastapi.testclient import TestClient

from app.api.v1.endpoints import nfce as nfce_endpoint
from app.main import app

client = TestClient(app)


def test_preview_rejeita_arquivo_que_nao_e_imagem() -> None:
    response = client.post(
        "/api/v1/nfce/preview",
        files={"file": ("nota.txt", b"texto", "text/plain")},
    )

    assert response.status_code == 415


def test_preview_retorna_dados_sem_gravar(monkeypatch) -> None:
    qr_url = "https://consulta.exemplo.gov.br/qrcode?p=35260712345678000123650010000012341000012345|2|1|ABC"

    monkeypatch.setattr(nfce_endpoint, "decode_qr_from_bytes", lambda _: qr_url)
    monkeypatch.setattr(
        nfce_endpoint,
        "consultar_nfce_por_qrcode",
        lambda _: {
            "ok": True,
            "mensagem": "Dados encontrados.",
            "mercado_nome": "Mercado Teste",
            "cnpj": "12.345.678/0001-23",
            "data_compra": "2026-07-12",
            "valor_total": 10.5,
            "itens": [
                {
                    "descricao_original": "Produto Teste",
                    "quantidade": 1,
                    "unidade": "un",
                    "valor_unitario": 10.5,
                    "valor_total": 10.5,
                }
            ],
            "forma_pagamento": "PIX",
            "valor_pago": 10.5,
            "html_obtido": True,
        },
    )

    response = client.post(
        "/api/v1/nfce/preview",
        files={"file": ("qr.jpg", b"imagem-falsa", "image/jpeg")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["mercado_nome"] == "Mercado Teste"
    assert body["chave_nfce"] == "35260712345678000123650010000012341000012345"
