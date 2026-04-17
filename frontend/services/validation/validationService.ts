import {
  apiPost,
  API_ENDPOINTS,
  isAppError,
  isAppErrorCode,
} from "@/services/api/client";
import type { ValidationResult } from "@/types/habits";

function mapValidationError(error: unknown): Error {
  if (!isAppError(error)) {
    return new Error("No se pudo validar la foto en este momento.");
  }

  if (error.apiCode === "validation_not_configured") {
    return new Error("La validación de fotos no está disponible en este entorno.");
  }

  if (error.apiCode === "validation_provider_unavailable") {
    return new Error("La validación de fotos no está disponible temporalmente. Inténtalo más tarde.");
  }

  if (isAppErrorCode(error, "offline_mode")) {
    return new Error("La validación de fotos no está disponible en modo offline.");
  }

  if (isAppErrorCode(error, "auth_required")) {
    return new Error("Tu sesión expiró. Inicia sesión de nuevo para validar tu hábito.");
  }

  if (isAppErrorCode(error, "network_unavailable")) {
    return new Error("No se pudo contactar el servicio de validación. Verifica tu conexión.");
  }

  if (isAppErrorCode(error, "backend_unavailable")) {
    return new Error(
      "El servidor de validación reportó un error interno o está caído. Inténtalo más tarde.",
    );
  }

  return new Error(error.message || "No se pudo validar la foto en este momento.");
}

export async function validateHabit(
  habitId: number,
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<ValidationResult> {
  try {
    return await apiPost<ValidationResult>(
      API_ENDPOINTS.habits.validate,
      JSON.stringify({ habit_id: habitId, image_base64: imageBase64, mime_type: mimeType }),
    );
  } catch (error) {
    throw mapValidationError(error);
  }
}
