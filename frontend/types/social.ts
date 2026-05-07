export interface SharedStreak {
  current: number;
  today_completed_members: number;
  required_members: number;
  ready: boolean;
}

export interface SharedStreakMember {
  user_id: number;
  username: string;
  status: "active" | "left";
  share_progress: boolean;
  joined_at: string | null;
  today_completed: boolean;
}

export interface SharedStreakGroup {
  id: number;
  name: string;
  invite_code: string;
  owner_user_id: number;
  member_count: number;
  shared_streak: SharedStreak;
  created_at: string | null;
  members?: SharedStreakMember[];
}

export interface CreateSharedGroupPayload {
  name: string;
}

export interface JoinSharedGroupPayload {
  invite_code: string;
}
