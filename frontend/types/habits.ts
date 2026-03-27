export interface Habit {
  id: number;
  user_id: number;
  name: string;
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

export interface CreateHabitPayload {
  name: string;
  icon?: string;
  habit_type?: "boolean" | "time" | "quantity";
  frequency?: "daily" | "weekly";
  section?: "fire" | "plant" | "moon";
  target_duration?: number | null;
  pomodoro_enabled?: boolean;
  target_quantity?: number | null;
  target_unit?: string | null;
}

export type UpdateHabitPayload = Partial<CreateHabitPayload>;

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
