from __future__ import annotations

import json
import logging
import re
import time
from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse, Response

logger = logging.getLogger("gestao_compras.telemetria")

_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,64}$")


def request_id_from_request(request: Request) -> str:
    current = getattr(request.state, "request_id", "")
    if isinstance(current, str) and current:
        return current

    candidate = request.headers.get("x-request-id", "").strip()
    request_id = candidate if _REQUEST_ID_PATTERN.fullmatch(candidate) else uuid4().hex
    request.state.request_id = request_id
    return request_id


def route_template(request: Request) -> str:
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    if isinstance(path, str) and path:
        return path
    return "rota-nao-identificada"


def log_technical_event(
    *,
    event: str,
    page: str,
    app_version: str,
    code: str,
    request_id: str,
) -> None:
    logger.info(
        json.dumps(
            {
                "kind": "client_technical_event",
                "event": event,
                "page": page,
                "app_version": app_version,
                "code": code,
                "request_id": request_id,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )


async def observability_middleware(request: Request, call_next) -> Response:
    request_id = request_id_from_request(request)
    started_at = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:  # pragma: no cover - validated by integration behavior
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        logger.exception(
            json.dumps(
                {
                    "kind": "unhandled_api_error",
                    "request_id": request_id,
                    "method": request.method,
                    "route": route_template(request),
                    "duration_ms": duration_ms,
                },
                ensure_ascii=False,
                separators=(",", ":"),
            )
        )
        response = JSONResponse(
            status_code=500,
            content={
                "detail": "Ocorreu uma falha interna. Tente novamente em instantes.",
                "request_id": request_id,
            },
        )

    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"

    logger.info(
        json.dumps(
            {
                "kind": "api_request",
                "request_id": request_id,
                "method": request.method,
                "route": route_template(request),
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )
    return response
