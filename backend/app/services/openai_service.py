"""
OpenAI service module.

Responsibility:
- Interact with OpenAI Vision API to analyze habit evidence images.
"""

import json

from flask import current_app
from openai import OpenAI

from app.config import is_openai_configured

VALIDATION_NOT_CONFIGURED_CODE = "validation_not_configured"
VALIDATION_PROVIDER_UNAVAILABLE_CODE = "validation_provider_unavailable"


class ValidationUnavailableError(RuntimeError):
    """Raised when photo validation is unavailable for operational reasons."""

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code


def analyze_habit_image(habit_name: str, image_base64: str) -> dict:
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
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}",
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
        raise ValidationUnavailableError(
            "La validación de fotos no está disponible temporalmente.",
            VALIDATION_PROVIDER_UNAVAILABLE_CODE,
        ) from exc

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        # Remove first and last lines (``` markers)
        lines = [line for line in lines if not line.strip().startswith("```")]
        raw = "\n".join(lines)

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {"valido": False, "razon": "Error al procesar la respuesta de la IA.", "confianza": 0.0}

    return {
        "valido": bool(result.get("valido", False)),
        "razon": str(result.get("razon", "Sin razón proporcionada.")),
        "confianza": float(result.get("confianza", 0.0)),
    }
