from __future__ import annotations

import re
from io import BytesIO
from urllib.parse import parse_qs, urlparse

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_IMAGE_DIMENSION = 2400
MAX_IMAGE_PIXELS = 30_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


class InvalidImageError(ValueError):
    """Imagem inválida ou não suportada."""


def extrair_chave_nfce(texto: str) -> str:
    """Extrai uma chave NFC-e/NF-e de 44 dígitos de uma URL ou texto."""
    if not texto:
        return ""

    try:
        parsed = urlparse(texto)
        params = parse_qs(parsed.query)

        for key in ("chNFe", "chave", "chaveNFe", "chNFeSat"):
            values = params.get(key)
            if values:
                digits = re.sub(r"\D", "", values[0])
                if len(digits) >= 44:
                    return digits[:44]

        values = params.get("p")
        if values:
            digits = re.sub(r"\D", "", values[0].split("|")[0])
            if len(digits) >= 44:
                return digits[:44]
    except (TypeError, ValueError):
        pass

    match = re.search(r"(?<!\d)\d{44}(?!\d)", texto)
    if match:
        return match.group(0)

    digits = re.sub(r"\D", "", texto)
    match = re.search(r"\d{44}", digits)
    return match.group(0) if match else ""


def _load_image(image_bytes: bytes) -> Image.Image:
    if not image_bytes:
        raise InvalidImageError("A imagem enviada está vazia.")

    try:
        image = Image.open(BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image)
        image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImageError("O arquivo enviado não é uma imagem válida.") from exc

    if image.width <= 0 or image.height <= 0:
        raise InvalidImageError("A imagem possui dimensões inválidas.")

    if image.width * image.height > MAX_IMAGE_PIXELS:
        raise InvalidImageError("A imagem é grande demais para processamento.")

    image = image.convert("RGB")
    largest_dimension = max(image.width, image.height)
    if largest_dimension > MAX_IMAGE_DIMENSION:
        ratio = MAX_IMAGE_DIMENSION / largest_dimension
        image = image.resize(
            (max(1, int(image.width * ratio)), max(1, int(image.height * ratio))),
            Image.Resampling.LANCZOS,
        )

    return image


def _decode_variant(detector: cv2.QRCodeDetector, image: np.ndarray) -> str:
    try:
        data, _, _ = detector.detectAndDecode(image)
        if data:
            return data.strip()
    except cv2.error:
        pass

    try:
        detected, decoded_info, _, _ = detector.detectAndDecodeMulti(image)
        if detected:
            for value in decoded_info:
                if value:
                    return value.strip()
    except (cv2.error, ValueError):
        pass

    return ""


def _variants(rgb: np.ndarray) -> list[np.ndarray]:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    variants: list[np.ndarray] = [rgb, gray]

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrasted = clahe.apply(gray)
    variants.append(contrasted)

    sharpened = cv2.filter2D(
        contrasted,
        -1,
        np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.int8),
    )
    variants.append(sharpened)

    for source in (gray, contrasted, sharpened):
        try:
            variants.append(
                cv2.threshold(
                    source,
                    0,
                    255,
                    cv2.THRESH_BINARY + cv2.THRESH_OTSU,
                )[1]
            )
        except cv2.error:
            continue

    height, width = gray.shape[:2]
    if max(height, width) < 1400:
        enlarged = cv2.resize(
            gray,
            None,
            fx=1.75,
            fy=1.75,
            interpolation=cv2.INTER_CUBIC,
        )
        variants.append(enlarged)

    return variants


def decode_qr_from_bytes(image_bytes: bytes) -> str:
    """Lê o primeiro QR Code encontrado na imagem enviada."""
    image = _load_image(image_bytes)
    rgb = np.asarray(image)
    detector = cv2.QRCodeDetector()

    for variant in _variants(rgb):
        for rotated in (
            variant,
            cv2.rotate(variant, cv2.ROTATE_90_CLOCKWISE),
            cv2.rotate(variant, cv2.ROTATE_180),
            cv2.rotate(variant, cv2.ROTATE_90_COUNTERCLOCKWISE),
        ):
            decoded = _decode_variant(detector, rotated)
            if decoded:
                return decoded

    return ""
