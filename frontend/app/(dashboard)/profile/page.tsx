"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
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
  Rocket,
  Sparkles,
  Bell,
  Moon,
  Sun,
  Monitor,
  Globe,
  ChevronRight,
  ImageIcon,
  LogOut,
} from "lucide-react";
import { fetchProfileStats, fetchXpInfo, fetchDetailedStats } from "@/services/stats/statsService";
import { getSession, clearSession } from "@/services/auth/authService";
import { cn } from "@/lib/utils";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";
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

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      const session = getSession();
      if (session?.user) {
        setUser(session.user);
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

  const achievementData: AchievementData = useMemo(() => ({
    streak: records.current_streak,
    totalCheckins: stats.today_completed, // simplified; detailed has total_completed
    totalValidations: validationStats.total_successful,
    habitsCount: stats.habits_count,
    longestStreak: records.longest_streak,
    activeDays: records.active_days,
    level: xpInfo.level,
  }), [records, stats, validationStats, xpInfo]);

  const unlockedCount = useMemo(() => {
    return ACHIEVEMENTS.filter((a) => a.check(achievementData)).length;
  }, [achievementData]);

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  return (
    <div className="py-6 space-y-6 max-w-lg mx-auto px-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
          <p className="text-sm text-muted-foreground">Tu progreso y logros</p>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="size-5" />
        </button>
      </div>

      {/* User Card */}
      <ClayMotionBox className="p-4 flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl shadow-inner">
            <Rocket className="size-8 text-white drop-shadow-md" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-lg">{user?.username ?? "Usuario"}</span>
              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                <Trophy className="size-3 inline mr-1" /> Nivel {xpInfo.level}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Racha actual: {records.current_streak} días <Flame className="size-3 inline text-orange-400" />
            </p>
            {/* XP Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Experiencia</span>
                <span>{xpInfo.xp_in_level} / {xpInfo.xp_for_next_level} XP</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 transition-all duration-500"
                  style={{ width: `${xpInfo.progress_pct}%` }}
                />
              </div>
            </div>
          </div>
      </ClayMotionBox>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 @sm:grid-cols-4 gap-3">
        <ClayMotionBox className="p-4 space-y-1 !rounded-2xl">
          <Target className="size-5 text-primary" />
          <p className="text-2xl font-bold text-foreground">{stats.habits_count}</p>
          <p className="text-xs text-muted-foreground">Hábitos creados</p>
        </ClayMotionBox>
        <ClayMotionBox className="p-4 space-y-1 !rounded-2xl">
          <Star className="size-5 text-purple-400" />
          <p className="text-2xl font-bold text-foreground">{records.active_days}</p>
          <p className="text-xs text-muted-foreground">Días activos</p>
        </ClayMotionBox>
        <ClayMotionBox className="p-4 space-y-1 !rounded-2xl">
          <Flame className="size-5 text-orange-400" />
          <p className="text-2xl font-bold text-foreground">{records.longest_streak}</p>
          <p className="text-xs text-muted-foreground">Racha más larga</p>
        </ClayMotionBox>
        <ClayMotionBox className="p-4 space-y-1 !rounded-2xl">
          <Trophy className="size-5 text-yellow-400" />
          <p className="text-2xl font-bold text-foreground">{unlockedCount}/{ACHIEVEMENTS.length}</p>
          <p className="text-xs text-muted-foreground">Total logros</p>
        </ClayMotionBox>
      </div>

      {/* Logros */}
      <ClayMotionBox className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Logros</h2>
          <span className="text-xs text-muted-foreground">{unlockedCount} de {ACHIEVEMENTS.length}</span>
        </div>
        <div className="grid grid-cols-3 @xs:grid-cols-4 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = ach.check(achievementData);
            return (
              <div
                key={ach.name}
                className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all",
                  unlocked
                    ? `${ach.color} text-white shadow-inner`
                    : "bg-secondary text-muted-foreground opacity-50"
                )}
                title={ach.description}
              >
                <ach.icon className="size-5" />
                <span className="text-[9px] font-medium text-center leading-tight">
                  {ach.name}
                </span>
              </div>
            );
          })}
        </div>
      </ClayMotionBox>

      {/* Récords */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground px-1">Récords Históricos</h2>
        <ClayMotionBox className="p-0 overflow-hidden divide-y divide-border">
          <div className="flex items-center gap-3 p-4">
            <Flame className="size-5 text-orange-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Racha más larga</p>
              <p className="text-xs text-muted-foreground">Tu mejor marca</p>
            </div>
            <span className="text-lg font-bold text-foreground">{records.longest_streak} días</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Calendar className="size-5 text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Días activos</p>
              <p className="text-xs text-muted-foreground">Total histórico</p>
            </div>
            <span className="text-lg font-bold text-foreground">{records.active_days}</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Zap className="size-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Mejor día</p>
              <p className="text-xs text-muted-foreground">Más hábitos en un día</p>
            </div>
            <span className="text-lg font-bold text-foreground">{records.best_day}</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <ImageIcon className="size-5 text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Validaciones exitosas</p>
              <p className="text-xs text-muted-foreground">
                {validationStats.success_rate}% tasa de éxito
              </p>
            </div>
            <span className="text-lg font-bold text-foreground">{validationStats.total_successful}</span>
          </div>
        </ClayMotionBox>
      </div>

      {/* XP Total */}
      <ClayMotionBox className="p-4 flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
          <Sparkles className="size-6 text-yellow-950" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">XP Total</p>
          <p className="text-xs text-muted-foreground">Nivel {xpInfo.level}</p>
        </div>
        <span className="text-2xl font-bold text-foreground">{xpInfo.total_xp}</span>
      </ClayMotionBox>

      {/* Settings */}
      <ClayMotionBox className="p-0 overflow-hidden divide-y divide-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Bell className="size-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Notificaciones</span>
          </div>
          <div className="w-10 h-6 bg-primary rounded-full flex items-center p-0.5">
            <div className="size-5 bg-white rounded-full ml-auto" />
          </div>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="size-4 text-muted-foreground" />
            ) : theme === "light" ? (
              <Sun className="size-4 text-muted-foreground" />
            ) : (
              <Monitor className="size-4 text-muted-foreground" />
            )}
            <span className="text-sm text-foreground">Tema</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-transparent text-sm text-muted-foreground outline-none appearance-none cursor-pointer"
            >
              <option value="system">Sistema</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
            <ChevronRight className="size-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Globe className="size-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Idioma</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Español</span>
            <ChevronRight className="size-4" />
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogOut className="size-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">Cerrar Sesión</span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </ClayMotionBox>
    </div>
  );
}
