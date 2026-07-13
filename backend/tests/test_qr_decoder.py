from app.services.qr_decoder import extrair_chave_nfce


def test_extrair_chave_do_parametro_p() -> None:
    key = "35260712345678000123650010000012341000012345"
    url = f"https://consulta.exemplo.gov.br/qrcode?p={key}|2|1|ABC"

    assert extrair_chave_nfce(url) == key


def test_extrair_chave_de_texto_livre() -> None:
    key = "35260712345678000123650010000012341000012345"

    assert extrair_chave_nfce(f"Chave: {key}") == key
