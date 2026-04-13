"""
OpenAI service module.

Responsibility:
- Interact with OpenAI Vision API to analyze habit evidence images.
"""

import base64
import json

from flask import current_app
from openai import OpenAI

from app.config import is_openai_configured

VALIDATION_NOT_CONFIGURED_CODE = "validation_not_configured"
VALIDATION_PROVIDER_UNAVAILABLE_CODE = "validation_provider_unavailable"
SUPPORTED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


class ValidationUnavailableError(RuntimeError):
    """Raised when photo validation is unavailable for operational reasons."""

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code


def _normalize_mime_type(mime_type: str | None) -> str:
    if mime_type is None:
        return "image/jpeg"

    normalized = mime_type.strip().lower()
    if normalized not in SUPPORTED_IMAGE_MIME_TYPES:
        raise ValueError("mime_type must be image/jpeg, image/png, or image/webp.")

    return "image/jpeg" if normalized == "image/jpg" else normalized


def _sanitize_base64_payload(image_base64: str) -> str:
    normalized = "".join(image_base64.strip().split())
    if not normalized:
        raise ValueError("image (base64) is required.")

    try:
        decoded = base64.b64decode(normalized, validate=True)
    except ValueError as exc:
        raise ValueError("image must be valid base64.") from exc

    if len(decoded) > MAX_IMAGE_BYTES:
        raise ValueError("image exceeds the 10MB validation limit.")

    return normalized


def analyze_habit_image(habit_name: str, image_base64: str, mime_type: str | None = None) -> dict:
    """Analyze an image using OpenAI Vision to validate a habit.

    Args:
        habit_name: Name of the habit to validate (e.g. "Hacer ejercicio").
        image_base64: Base64-encoded image string.

    Returns:
        dict with keys: valido (bool), razon (str), confianza (float).
    """
    if not is_openai_configured(current_app.config):
        raise ValidationUnavailableError(
            "La validación de fotos no está disponible en este entorno.",
            VALIDATION_NOT_CONFIGURED_CODE,
        )

    normalized_mime_type = _normalize_mime_type(mime_type)
    normalized_image_base64 = _sanitize_base64_payload(image_base64)
    api_key = str(current_app.config.get("OPENAI_API_KEY") or "").strip()

    prompt = (
        "Eres un sistema que valida evidencia visual de hábitos.\n\n"
        f"Hábito: {habit_name}\n\n"
        "Analiza la imagen y responde SOLO en JSON válido con este formato:\n"
        '{\n'
        '  "valido": true o false,\n'
        '  "razon": "explicación breve en español",\n'
        '  "confianza": número entre 0 y 1\n'
        '}\n\n'
        "Reglas:\n"
        "- Determina si la imagen muestra evidencia razonable de que la persona "
        "está realizando o ha realizado el hábito indicado.\n"
        "- Sé flexible pero honesto. Si la imagen no tiene relación, marca como inválido.\n"
        "- Responde ÚNICAMENTE con el JSON, sin texto adicional."
    )

    try:
        client = OpenAI(api_key=api_key, timeout=20.0)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{normalized_mime_type};base64,{normalized_image_base64}",
                                "detail": "low",
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
            temperature=0.2,
        )
    except Exception as exc:
        current_app.logger.exception("Habit validation provider call failed.")
        raise ValidationUnavailableError(
            "La validación de fotos no está disponible temporalmente.",
            VALIDATION_PROVIDER_UNAVAILABLE_CODE,
        ) from exc

    raw_content = response.choices[0].message.content
    if isinstance(raw_content, list):
        raw = "".join(
            chunk.get("text", "")
            for chunk in raw_content
            if isinstance(chunk, dict) and chunk.get("type") == "text"
        ).strip()
    else:
        raw = str(raw_content or "").strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        # Remove first and last lines (``` markers)
        lines = [line for line in lines if not line.strip().startswith("```")]
        raw = "\n".join(lines)

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        current_app.logger.warning("Habit validation provider returned invalid JSON.")
        raise ValidationUnavailableError(
            "La validación de fotos no está disponible temporalmente.",
            VALIDATION_PROVIDER_UNAVAILABLE_CODE,
        ) from exc

    return {
        "valido": bool(result.get("valido", False)),
        "razon": str(result.get("razon", "Sin razón proporcionada.")),
        "confianza": float(result.get("confianza", 0.0)),
    }
