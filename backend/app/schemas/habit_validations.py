"""
Habit validation schemas module.

Responsibility:
- Validate payloads for habit create and update operations.
"""

VALID_HABIT_TYPES = {"boolean", "time", "quantity"}
VALID_FREQUENCIES = {"daily", "weekly"}
VALID_SECTIONS = {"fire", "plant", "moon"}


def validate_create_habit(data: dict | None) -> list[str]:
    """Validate habit creation payload. Returns list of error messages."""
    errors: list[str] = []

    if not data:
        return ["Request body is required."]

    name = data.get("name", "").strip() if isinstance(data.get("name"), str) else ""
    if not name:
        errors.append("Habit name is required.")
    elif len(name) > 120:
        errors.append("Habit name must be at most 120 characters.")

    habit_type = data.get("habit_type", "boolean")
    if habit_type not in VALID_HABIT_TYPES:
        errors.append(f"habit_type must be one of: {', '.join(VALID_HABIT_TYPES)}.")

    frequency = data.get("frequency", "daily")
    if frequency not in VALID_FREQUENCIES:
        errors.append(f"frequency must be one of: {', '.join(VALID_FREQUENCIES)}.")

    section = data.get("section", "fire")
    if section not in VALID_SECTIONS:
        errors.append(f"section must be one of: {', '.join(VALID_SECTIONS)}.")

    if habit_type == "time":
        duration = data.get("target_duration")
        if duration is not None and (not isinstance(duration, int) or duration < 1):
            errors.append("target_duration must be a positive integer.")

    if habit_type == "quantity":
        qty = data.get("target_quantity")
        if qty is not None and (not isinstance(qty, int) or qty < 1):
            errors.append("target_quantity must be a positive integer.")

    return errors


def validate_update_habit(data: dict | None) -> list[str]:
    """Validate habit update payload. Returns list of error messages."""
    errors: list[str] = []

    if not data:
        return ["Request body is required."]

    if "name" in data:
        name = data["name"].strip() if isinstance(data["name"], str) else ""
        if not name:
            errors.append("Habit name cannot be empty.")
        elif len(name) > 120:
            errors.append("Habit name must be at most 120 characters.")

    if "habit_type" in data and data["habit_type"] not in VALID_HABIT_TYPES:
        errors.append(f"habit_type must be one of: {', '.join(VALID_HABIT_TYPES)}.")

    if "frequency" in data and data["frequency"] not in VALID_FREQUENCIES:
        errors.append(f"frequency must be one of: {', '.join(VALID_FREQUENCIES)}.")

    if "section" in data and data["section"] not in VALID_SECTIONS:
        errors.append(f"section must be one of: {', '.join(VALID_SECTIONS)}.")

    return errors
