export type HabitDifficulty = "facil" | "media" | "dificil";

export interface Habit {
  id: number;
  user_id: number;
  catalog_habit_id?: number | null;
  name: string;
  description?: string | null;
  difficulty?: HabitDifficulty | null;
  xp_base?: number | null;
  active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  icon: string;
  habit_type: "boolean" | "time" | "quantity";
  frequency: "daily" | "weekly";
  section: "fire" | "plant" | "moon";
  target_duration: number | null;
  pomodoro_enabled: boolean;
  target_quantity: number | null;
  target_unit: string | null;
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
}

export interface CreateHabitPayload {
  habito_id: number;
}

export interface UpdateHabitPayload {
  name?: string;
}

export const SECTION_LABELS: Record<string, string> = {
  fire: "BIENESTAR",
  plant: "APRENDIZAJE",
  moon: "SALUD",
};

export const SECTION_ICONS: Record<string, string> = {
  fire: "🔥",
  plant: "🌱",
  moon: "🌙",
};

export interface ValidationResult {
  valido: boolean;
  razon: string;
  confianza: number;
  xp_ganado?: number;
  nueva_racha?: number;
}
