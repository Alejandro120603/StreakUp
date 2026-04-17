"""
Habit validation schemas module.

Responsibility:
- Validate payloads for habit create and update operations.
"""

from collections.abc import Mapping

VALID_VALIDATION_TYPES = {"foto", "texto", "tiempo"}
VALID_FREQUENCIES = {"daily", "weekly"}
VALID_HABIT_TYPES = {"boolean", "time", "quantity"}


def _normalize_text(value: object, field_name: str, *, max_length: int) -> tuple[str | None, str | None]:
    if value is None:
        return None, None
    if not isinstance(value, str):
        return None, f"{field_name} must be a string."

    normalized = value.strip()
    if not normalized:
        return None, None
    if len(normalized) > max_length:
        return None, f"{field_name} must be at most {max_length} characters."
    return normalized, None


def _normalize_optional_int(
    value: object,
    field_name: str,
    *,
    allow_zero: bool = True,
) -> tuple[int | None, str | None]:
    if value is None:
        return None, None
    if isinstance(value, bool) or not isinstance(value, int):
        return None, f"{field_name} must be an integer."
    if value < 0 or (not allow_zero and value == 0):
        comparator = "zero or greater" if allow_zero else "greater than zero"
        return None, f"{field_name} must be {comparator}."
    return value, None


def _normalize_validation_type(value: object) -> tuple[str | None, str | None]:
    if value is None:
        return None, None
    if not isinstance(value, str):
        return None, "validation_type must be a string."
    normalized = value.strip().lower()
    if normalized not in VALID_VALIDATION_TYPES:
        options = ", ".join(sorted(VALID_VALIDATION_TYPES))
        return None, f"validation_type must be one of: {options}."
    return normalized, None


def _normalize_frequency(value: object) -> tuple[str | None, str | None]:
    if value is None:
        return None, None
    if not isinstance(value, str):
        return None, "frequency must be a string."
    normalized = value.strip().lower()
    if normalized not in VALID_FREQUENCIES:
        options = ", ".join(sorted(VALID_FREQUENCIES))
        return None, f"frequency must be one of: {options}."
    return normalized, None


def normalize_habit_payload(
    data: Mapping[str, object] | None,
    *,
    require_habito_id: bool,
) -> tuple[dict[str, object], list[str]]:
    """Validate and normalize create/update payloads."""
    errors: list[str] = []

    if not data:
        return {}, ["Request body is required."]

    normalized: dict[str, object] = {}

    if require_habito_id:
        habito_id = data.get("habito_id")
        if habito_id is None:
            errors.append("habito_id is required.")
        else:
            parsed_habito_id: int | None = None
            if isinstance(habito_id, int) and not isinstance(habito_id, bool):
                parsed_habito_id = habito_id
            elif isinstance(habito_id, str) and habito_id.strip().isdigit():
                parsed_habito_id = int(habito_id.strip())

            if parsed_habito_id is None:
                errors.append("habito_id must be an integer.")
            else:
                normalized["habito_id"] = parsed_habito_id

    custom_name, error = _normalize_text(data.get("custom_name"), "custom_name", max_length=120)
    if error:
        errors.append(error)
    elif "custom_name" in data:
        normalized["custom_name"] = custom_name

    if "name" in data and "custom_name" not in data:
        custom_name, error = _normalize_text(data.get("name"), "name", max_length=120)
        if error:
            errors.append(error)
        else:
            normalized["custom_name"] = custom_name

    description, error = _normalize_text(data.get("description"), "description", max_length=2000)
    if error:
        errors.append(error)
    elif "description" in data:
        normalized["description"] = description

    validation_type, error = _normalize_validation_type(data.get("validation_type"))
    if error:
        errors.append(error)
    elif "validation_type" in data:
        normalized["validation_type"] = validation_type

    frequency, error = _normalize_frequency(data.get("frequency"))
    if error:
        errors.append(error)
    elif "frequency" in data:
        normalized["frequency"] = frequency

    target_quantity, error = _normalize_optional_int(data.get("target_quantity"), "target_quantity")
    if error:
        errors.append(error)
    elif "target_quantity" in data:
        normalized["target_quantity"] = target_quantity

    target_duration, error = _normalize_optional_int(data.get("target_duration"), "target_duration")
    if error:
        errors.append(error)
    elif "target_duration" in data:
        normalized["target_duration"] = target_duration

    target_unit, error = _normalize_text(data.get("target_unit"), "target_unit", max_length=40)
    if error:
        errors.append(error)
    elif "target_unit" in data:
        normalized["target_unit"] = target_unit

    return normalized, errors


def normalize_create_habit_payload(data: Mapping[str, object] | None) -> tuple[dict[str, object], list[str]]:
    """Validate create payload for user-habit assignment plus optional overrides."""
    return normalize_habit_payload(data, require_habito_id=True)


def normalize_update_habit_payload(data: Mapping[str, object] | None) -> tuple[dict[str, object], list[str]]:
    """Validate update payload for user-habit overrides."""
    return normalize_habit_payload(data, require_habito_id=False)
