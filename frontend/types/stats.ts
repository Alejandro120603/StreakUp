export interface StatsSummary {
  streak: number;
  today_completed: number;
  today_total: number;
  completion_rate: number;
}

export interface ProfileStats extends StatsSummary {
  habits_count: number;
}
