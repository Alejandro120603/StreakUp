export type HabitDifficulty = "facil" | "media" | "dificil";
export type ValidationType = "foto" | "texto" | "tiempo";
export type HabitFrequency = "daily" | "weekly" | "custom";

export interface Habit {
  id: number;
  user_id: number;
  catalog_habit_id?: number | null;
  name: string;
  custom_name?: string | null;
  description?: string | null;
  custom_description?: string | null;
  difficulty?: HabitDifficulty | null;
  xp_base?: number | null;
  active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  icon: string;
  validation_type?: ValidationType;
  habit_type: "boolean" | "time" | "quantity";
  frequency: HabitFrequency;
  section: "fire" | "plant" | "moon";
  target_duration: number | null;
  pomodoro_enabled: boolean;
  target_quantity: number | null;
  target_unit: string | null;
  min_text_length?: number | null;
  schedule_days?: number[];
  created_at: string;
  updated_at: string;
}

export interface HabitCatalogItem {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  difficulty: HabitDifficulty;
  xp_base: number;
  validation_type: ValidationType;
  frequency: HabitFrequency;
  target_quantity: number | null;
  target_unit: string | null;
  target_duration: number | null;
}

export interface CreateHabitPayload {
  habito_id: number;
  custom_name?: string | null;
  description?: string | null;
  validation_type?: ValidationType | null;
  frequency?: HabitFrequency | null;
  target_duration?: number | null;
  target_quantity?: number | null;
  target_unit?: string | null;
  min_text_length?: number | null;
  schedule_days?: number[];
}

export interface UpdateHabitPayload {
  name?: string | null;
  custom_name?: string | null;
  description?: string | null;
  custom_description?: string | null;
  validation_type?: ValidationType | null;
  icon?: string;
  section?: "fire" | "plant" | "moon";
  habit_type?: "boolean" | "time" | "quantity";
  frequency?: HabitFrequency | null;
  target_duration?: number | null;
  target_quantity?: number | null;
  target_unit?: string | null;
  pomodoro_enabled?: boolean;
  min_text_length?: number | null;
  schedule_days?: number[];
}

export const SECTION_LABELS: Record<string, string> = {
  fire: "BIENESTAR",
  plant: "APRENDIZAJE",
  moon: "SALUD",
};

export const SECTION_ICONS: Record<string, string> = {
  fire: "Flame",
  plant: "Sprout",
  moon: "Moon",
};

export const VALIDATION_TYPE_LABELS: Record<ValidationType, string> = {
  foto: "Foto",
  texto: "Texto",
  tiempo: "Tiempo",
};

export function getHabitTargetSummary(habit: Pick<Habit, "target_duration" | "target_quantity" | "target_unit">): string | null {
  if (habit.target_duration !== null) {
    return `${habit.target_duration} min`;
  }
  if (habit.target_quantity !== null) {
    return habit.target_unit
      ? `${habit.target_quantity} ${habit.target_unit}`
      : `${habit.target_quantity}`;
  }
  return null;
}

export interface ValidationResult {
  valido: boolean;
  razon: string;
  confianza: number;
  xp_ganado?: number;
  nueva_racha?: number;
}
