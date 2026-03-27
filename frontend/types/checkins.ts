import type { Habit } from "./habits";

export interface TodayHabit extends Habit {
  checked_today: boolean;
}

export interface CheckinToggleResult {
  checked: boolean;
  habit_id: number;
  date: string;
}
