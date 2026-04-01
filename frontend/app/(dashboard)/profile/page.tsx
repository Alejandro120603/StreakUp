"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Target,
  Star,
  Flame,
  Trophy,
  Calendar,
  Zap,
  Award,
  Crown,
  Gem,
  Sparkles,
  Bell,
  Moon,
  Globe,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import { fetchProfileStats, fetchXpInfo, fetchDetailedStats } from "@/services/stats/statsService";
import { getCurrentUser } from "@/services/auth/authService";
import type { ProfileStats, XpInfo } from "@/types/stats";

interface AchievementDef {
  name: string;
  icon: typeof Zap;
  color: string;
  description: string;
  check: (data: AchievementData) => boolean;
}

interface AchievementData {
  streak: number;
  totalCheckins: number;
  totalValidations: number;
  habitsCount: number;
  longestStreak: number;
  activeDays: number;
  level: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    name: "Principiante",
    icon: Zap,
    color: "bg-blue-600",
    description: "Crea tu primer hábito",
    check: (d) => d.habitsCount >= 1,
  },
  {
    name: "Consistente",
    icon: Flame,
    color: "bg-yellow-600",
    description: "Racha de 3 días",
    check: (d) => d.streak >= 3,
  },
  {
    name: "Dedicado",
    icon: Award,
    color: "bg-green-600",
    description: "10 check-ins totales",
    check: (d) => d.totalCheckins >= 10,
  },
  {
    name: "Imparable",
    icon: Target,
    color: "bg-orange-600",
    description: "Racha de 7 días",
    check: (d) => d.streak >= 7,
  },
  {
    name: "Validador",
    icon: ImageIcon,
    color: "bg-teal-600",
    description: "5 validaciones exitosas",
    check: (d) => d.totalValidations >= 5,
  },
  {
    name: "Maestro",
    icon: Crown,
    color: "bg-red-600",
    description: "Alcanza nivel 5",
    check: (d) => d.level >= 5,
  },
  {
    name: "Leyenda",
    icon: Gem,
    color: "bg-purple-600",
    description: "Racha de 30 días",
    check: (d) => d.longestStreak >= 30,
  },
  {
    name: "Perfeccionista",
    icon: Sparkles,
    color: "bg-amber-600",
    description: "50 días activos",
    check: (d) => d.activeDays >= 50,
  },
];

export default function ProfilePage() {
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    streak: 0, today_completed: 0, today_total: 0, completion_rate: 0,
    habits_count: 0, total_xp: 0, level: 1, validations_today: 0,
  });
  const [xpInfo, setXpInfo] = useState<XpInfo>({
    total_xp: 0, level: 1, xp_in_level: 0, xp_for_next_level: 250, progress_pct: 0,
  });
  const [records, setRecords] = useState({
    longest_streak: 0, best_day: 0, current_streak: 0, active_days: 0,
  });
  const [validationStats, setValidationStats] = useState({
    total_successful: 0, total_attempts: 0, success_rate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }

      try {
        const [profileStats, xp, detailed] = await Promise.all([
          fetchProfileStats(),
          fetchXpInfo(),
          fetchDetailedStats(),
        ]);

        setStats(profileStats);
        setXpInfo(xp);
        setRecords(detailed.records);
        setValidationStats(detailed.validations);
      } catch {
        // silently fail — data will show defaults
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Achievement data for checking unlock status
  const achievementData: AchievementData = {
    streak: records.current_streak,
    totalCheckins: stats.today_completed, // simplified; detailed has total_completed
    totalValidations: validationStats.total_successful,
    habitsCount: stats.habits_count,
    longestStreak: records.longest_streak,
    activeDays: records.active_days,
    level: xpInfo.level,
  };

  const unlockedCount = ACHIEVEMENTS.filter((a) => a.check(achievementData)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6 max-w-lg mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Perfil</h1>
          <p className="text-sm text-muted-foreground">Tu progreso y logros</p>
        </div>
        <button className="text-muted-foreground hover:text-white transition-colors">
          <Settings className="size-5" />
        </button>
      </div>

      {/* User Card */}
      <div className="rounded-xl bg-gradient-to-r from-[#5D5FEF] via-purple-500 to-pink-500 p-[1px]">
        <div className="rounded-xl bg-[#111127] p-4 flex items-center gap-4">
          <div className="size-14 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl">
            🚀
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg">{user?.username ?? "Usuario"}</span>
              <span className="text-[10px] font-bold bg-[#5D5FEF] text-white px-2 py-0.5 rounded-full">
                🏆 Nivel {xpInfo.level}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Racha actual: {records.current_streak} días 🔥
            </p>
            {/* XP Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Experiencia</span>
                <span>{xpInfo.xp_in_level} / {xpInfo.xp_for_next_level} XP</span>
              </div>
              <div className="h-2 rounded-full bg-[#2A2A3E] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 transition-all duration-500"
                  style={{ width: `${xpInfo.progress_pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-1">
          <Target className="size-5 text-[#5D5FEF]" />
          <p className="text-2xl font-bold text-white">{stats.habits_count}</p>
          <p className="text-xs text-muted-foreground">Hábitos creados</p>
        </div>
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-1">
          <Star className="size-5 text-purple-400" />
          <p className="text-2xl font-bold text-white">{records.active_days}</p>
          <p className="text-xs text-muted-foreground">Días activos</p>
        </div>
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-1">
          <Flame className="size-5 text-orange-400" />
          <p className="text-2xl font-bold text-white">{records.longest_streak}</p>
          <p className="text-xs text-muted-foreground">Racha más larga</p>
        </div>
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-1">
          <Trophy className="size-5 text-yellow-400" />
          <p className="text-2xl font-bold text-white">{unlockedCount}/{ACHIEVEMENTS.length}</p>
          <p className="text-xs text-muted-foreground">Total logros</p>
        </div>
      </div>

      {/* Logros */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Logros</h2>
          <span className="text-xs text-muted-foreground">{unlockedCount} de {ACHIEVEMENTS.length}</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = ach.check(achievementData);
            return (
              <div
                key={ach.name}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all ${
                  unlocked
                    ? `${ach.color} border border-white/10`
                    : "bg-[#111127] border border-[#2A2A3E] opacity-50"
                }`}
                title={ach.description}
              >
                <ach.icon className={`size-5 ${unlocked ? "text-white" : "text-muted-foreground"}`} />
                <span className={`text-[9px] font-medium text-center leading-tight ${unlocked ? "text-white" : "text-muted-foreground"}`}>
                  {ach.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Récords */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">Récords</h2>
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] divide-y divide-[#2A2A3E]">
          <div className="flex items-center gap-3 p-4">
            <Flame className="size-5 text-orange-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Racha más larga</p>
              <p className="text-xs text-muted-foreground">Tu mejor marca</p>
            </div>
            <span className="text-lg font-bold text-white">{records.longest_streak} días</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Calendar className="size-5 text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Días activos</p>
              <p className="text-xs text-muted-foreground">Total histórico</p>
            </div>
            <span className="text-lg font-bold text-white">{records.active_days}</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Zap className="size-5 text-[#5D5FEF]" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Mejor día</p>
              <p className="text-xs text-muted-foreground">Más hábitos en un día</p>
            </div>
            <span className="text-lg font-bold text-white">{records.best_day}</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <ImageIcon className="size-5 text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Validaciones exitosas</p>
              <p className="text-xs text-muted-foreground">
                {validationStats.success_rate}% tasa de éxito
              </p>
            </div>
            <span className="text-lg font-bold text-white">{validationStats.total_successful}</span>
          </div>
        </div>
      </div>

      {/* XP Total */}
      <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 flex items-center gap-4">
        <div className="size-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
          <Sparkles className="size-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">XP Total</p>
          <p className="text-xs text-muted-foreground">Nivel {xpInfo.level}</p>
        </div>
        <span className="text-2xl font-bold text-white">{xpInfo.total_xp}</span>
      </div>

      {/* Settings */}
      <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] divide-y divide-[#2A2A3E]">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Bell className="size-4 text-muted-foreground" />
            <span className="text-sm text-white">Notificaciones</span>
          </div>
          <div className="w-10 h-6 bg-[#5D5FEF] rounded-full flex items-center p-0.5">
            <div className="size-5 bg-white rounded-full ml-auto" />
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Moon className="size-4 text-muted-foreground" />
            <span className="text-sm text-white">Tema</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Oscuro</span>
            <ChevronRight className="size-4" />
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Globe className="size-4 text-muted-foreground" />
            <span className="text-sm text-white">Idioma</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Español</span>
            <ChevronRight className="size-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
