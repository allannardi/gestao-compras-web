from __future__ import annotations

import ipaddress
import re
import socket
from datetime import datetime
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

MAX_HTML_BYTES = 5 * 1024 * 1024
MAX_REDIRECTS = 5
DEFAULT_TIMEOUT = (5, 12)


class UnsafeNfceUrlError(ValueError):
    """URL não permitida para consulta externa."""


def _br_money_to_float(texto: object) -> float:
    if texto is None:
        return 0.0

    value = str(texto).strip()
    match = re.search(
        r"-?\d{1,3}(?:\.\d{3})*,\d{1,2}|-?\d+,\d{1,2}|-?\d+\.\d{1,4}|-?\d+",
        value,
    )
    if not match:
        return 0.0

    number = match.group(0)
    if "," in number:
        number = number.replace(".", "").replace(",", ".")

    try:
        return float(number)
    except ValueError:
        return 0.0


def _br_qty_to_float(texto: object) -> float:
    if texto is None:
        return 0.0

    raw = str(texto).strip()
    normalized = raw.replace(".", "").replace(",", ".") if "," in raw else raw
    match = re.search(r"-?\d+(?:\.\d+)?", normalized)
    if not match:
        return 0.0

    try:
        return float(match.group(0))
    except ValueError:
        return 0.0


def _clean_text(texto: object) -> str:
    if texto is None:
        return ""
    return re.sub(r"\s+", " ", str(texto)).strip()


def _parse_date_any(texto: str) -> str:
    if not texto:
        return ""

    for pattern in (r"(\d{2}/\d{2}/\d{4})", r"(\d{4}-\d{2}-\d{2})"):
        match = re.search(pattern, texto)
        if not match:
            continue

        value = match.group(1)
        for date_format in ("%d/%m/%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(value, date_format).date().isoformat()
            except ValueError:
                continue

    return ""


def _ip_is_public(ip_text: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_text)
    except ValueError:
        return False

    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _validate_public_url(url: str) -> None:
    try:
        parsed = urlparse(url)
    except ValueError as exc:
        raise UnsafeNfceUrlError("A URL da NFC-e é inválida.") from exc

    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise UnsafeNfceUrlError("O QR Code não contém uma URL pública válida.")

    if parsed.username or parsed.password:
        raise UnsafeNfceUrlError("A URL da NFC-e contém credenciais não permitidas.")

    try:
        addresses = socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise UnsafeNfceUrlError("Não foi possível localizar o endereço da NFC-e.") from exc

    resolved_ips = {address[4][0] for address in addresses}
    if not resolved_ips or any(not _ip_is_public(ip) for ip in resolved_ips):
        raise UnsafeNfceUrlError("O endereço da NFC-e não é público ou não é permitido.")


def _download_html(url: str) -> str:
    current_url = url
    session = requests.Session()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) "
            "AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
        ),
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml",
    }

    for _ in range(MAX_REDIRECTS + 1):
        _validate_public_url(current_url)
        response = session.get(
            current_url,
            timeout=DEFAULT_TIMEOUT,
            headers=headers,
            allow_redirects=False,
            stream=True,
        )

        if response.is_redirect or response.is_permanent_redirect:
            location = response.headers.get("Location")
            response.close()
            if not location:
                raise requests.RequestException("Redirecionamento sem endereço de destino.")
            current_url = urljoin(current_url, location)
            continue

        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "").lower()
        if content_type and "html" not in content_type and "text" not in content_type:
            response.close()
            raise requests.RequestException("O portal da NFC-e não retornou uma página HTML.")

        chunks: list[bytes] = []
        total = 0
        for chunk in response.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            total += len(chunk)
            if total > MAX_HTML_BYTES:
                response.close()
                raise requests.RequestException("A página da NFC-e excedeu o limite permitido.")
            chunks.append(chunk)

        raw = b"".join(chunks)
        encoding = response.encoding or response.apparent_encoding or "utf-8"
        response.close()
        return raw.decode(encoding, errors="replace")

    raise requests.TooManyRedirects("A consulta da NFC-e excedeu o limite de redirecionamentos.")


def consolidar_itens_identicos(itens: list[dict]) -> list[dict]:
    """Soma itens com descrição, unidade e valor unitário iguais."""
    consolidated: dict[tuple[str, str, float], dict] = {}

    for item in itens:
        description = _clean_text(item.get("descricao_original"))
        unit = _clean_text(item.get("unidade") or "un").lower()
        unit_value = round(float(item.get("valor_unitario") or 0), 4)
        key = (description.casefold(), unit, unit_value)

        quantity = float(item.get("quantidade") or 0)
        total_value = float(item.get("valor_total") or 0)

        if key not in consolidated:
            consolidated[key] = {
                "descricao_original": description,
                "quantidade": quantity,
                "unidade": unit,
                "valor_unitario": unit_value,
                "valor_total": total_value,
            }
        else:
            consolidated[key]["quantidade"] += quantity
            consolidated[key]["valor_total"] += total_value

    result = []
    for item in consolidated.values():
        item["quantidade"] = round(item["quantidade"], 3)
        item["valor_total"] = round(item["valor_total"], 2)
        result.append(item)

    return result


def consultar_nfce_por_qrcode(qr_texto: str) -> dict:
    resultado = {
        "ok": False,
        "mensagem": "Ainda não consultei a NFC-e.",
        "mercado_nome": "",
        "cnpj": "",
        "data_compra": "",
        "valor_total": 0.0,
        "itens": [],
        "forma_pagamento": "",
        "valor_pago": 0.0,
        "html_obtido": False,
    }

    try:
        html = _download_html(qr_texto)
        resultado["html_obtido"] = True
    except (UnsafeNfceUrlError, requests.RequestException, OSError) as exc:
        resultado["mensagem"] = f"Não consegui consultar a página da NFC-e automaticamente: {exc}"
        return resultado

    try:
        soup = BeautifulSoup(html, "lxml")
        page_text = _clean_text(soup.get_text(" "))

        top_elements = [_clean_text(element.get_text(" ")) for element in soup.select(".txtTopo")]
        top_elements = [value for value in top_elements if value]
        if top_elements:
            resultado["mercado_nome"] = top_elements[0][:120]
        elif soup.title:
            resultado["mercado_nome"] = _clean_text(soup.title.get_text(" "))[:120]

        cnpj_match = re.search(
            r"CNPJ\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2})",
            page_text,
            re.IGNORECASE,
        )
        if cnpj_match:
            resultado["cnpj"] = cnpj_match.group(1)
        else:
            cnpj_fallback = re.search(
                r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b",
                page_text,
            )
            if cnpj_fallback:
                resultado["cnpj"] = cnpj_fallback.group(0)

        resultado["data_compra"] = _parse_date_any(page_text)

        money_pattern = (
            r"([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,2}|"
            r"[0-9]+,[0-9]{1,2}|[0-9]+\.[0-9]{1,4})"
        )
        for pattern in (
            rf"Valor\s+a\s+pagar\s*R?\$?\s*:?\s*{money_pattern}",
            rf"Valor\s+total\s*R?\$?\s*:?\s*{money_pattern}",
            rf"Valor\s+Pago\s*R?\$?\s*:?\s*{money_pattern}",
            rf"TOTAL\s*R?\$?\s*:?\s*{money_pattern}",
            rf"Total\s*R?\$?\s*:?\s*{money_pattern}",
        ):
            match = re.search(pattern, page_text, re.IGNORECASE)
            if match:
                resultado["valor_total"] = round(_br_money_to_float(match.group(1)), 2)
                break

        payment_match = re.search(
            rf"Forma\s+de\s+pagamento\s*:?\s*"
            rf"(?:Valor\s+pago\s*R?\$?\s*:?\s*)?(.+?)\s+{money_pattern}"
            rf"(?=\s+Troco|\s+Informação|\s+Informacao|$)",
            page_text,
            re.IGNORECASE,
        )
        if payment_match:
            resultado["forma_pagamento"] = _clean_text(payment_match.group(1))[:80]
            resultado["valor_pago"] = round(_br_money_to_float(payment_match.group(2)), 2)

        if not resultado["valor_total"] and resultado["valor_pago"]:
            resultado["valor_total"] = resultado["valor_pago"]

        blocks = soup.find_all(id=re.compile(r"^Item", re.IGNORECASE))
        if not blocks:
            blocks = soup.select("div:has(.txtTit), li:has(.txtTit)")

        items: list[dict] = []
        for block in blocks:
            description_element = block.select_one(".txtTit") or block.select_one(".txtTit2")
            description = (
                _clean_text(description_element.get_text(" "))
                if description_element
                else ""
            )
            if not description:
                continue

            quantity_element = block.select_one(".Rqtd")
            unit_element = block.select_one(".RUN")
            unit_value_element = block.select_one(".RvlUnit")
            total_element = block.select_one(".valor")

            quantity_text = _clean_text(quantity_element.get_text(" ")) if quantity_element else ""
            unit_text = _clean_text(unit_element.get_text(" ")) if unit_element else ""
            unit_value_text = (
                _clean_text(unit_value_element.get_text(" "))
                if unit_value_element
                else ""
            )
            total_text = _clean_text(total_element.get_text(" ")) if total_element else ""

            quantity = _br_qty_to_float(quantity_text) or 1.0
            unit = "un"
            unit_match = re.search(r"UN\s*:?\s*([A-ZÇ0-9]+)", unit_text, re.IGNORECASE)
            if unit_match:
                unit = unit_match.group(1).lower()

            unit_value = _br_money_to_float(unit_value_text)
            total_value = _br_money_to_float(total_text)
            if not unit_value and quantity and total_value:
                unit_value = total_value / quantity
            if not total_value and quantity and unit_value:
                total_value = quantity * unit_value

            items.append(
                {
                    "descricao_original": description,
                    "quantidade": round(quantity, 3),
                    "unidade": unit,
                    "valor_unitario": round(unit_value, 4),
                    "valor_total": round(total_value, 2),
                }
            )

        resultado["itens"] = consolidar_itens_identicos(items)

        if not resultado["valor_total"] and resultado["itens"]:
            resultado["valor_total"] = round(
                sum(float(item["valor_total"]) for item in resultado["itens"]),
                2,
            )

        if resultado["itens"] or resultado["valor_total"] or resultado["mercado_nome"]:
            resultado["ok"] = True
            resultado["mensagem"] = "Dados encontrados automaticamente. Confira as informações abaixo."
        else:
            resultado["mensagem"] = (
                "Consegui abrir a página da NFC-e, mas não encontrei os dados no layout retornado."
            )

        return resultado
    except (AttributeError, TypeError, ValueError, re.error) as exc:
        resultado["mensagem"] = f"A página foi aberta, mas não consegui interpretar os dados: {exc}"
        return resultado
