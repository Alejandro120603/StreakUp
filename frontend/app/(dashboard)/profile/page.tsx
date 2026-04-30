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
  Trash2,
} from "lucide-react";
import { fetchProfileStats, fetchXpInfo, fetchDetailedStats } from "@/services/stats/statsService";
import { getSession, clearSession } from "@/services/auth/authService";
import { deleteAccount } from "@/services/auth/accountService";
import { fetchAchievements } from "@/services/achievements/achievementService";
import type { AchievementItem } from "@/services/achievements/achievementService";
import { cn } from "@/lib/utils";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";
import { ConfirmDeleteAccountModal } from "@/components/feedback/ConfirmDeleteAccountModal";
import type { ProfileStats, XpInfo } from "@/types/stats";


// Icon mapping for achievement keys coming from the backend
const ACHIEVEMENT_ICON_MAP: Record<string, typeof Zap> = {
  first_validation: ImageIcon,
  streak_7: Flame,
  completions_30: Trophy,
};

function getAchievementIcon(key: string): typeof Zap {
  return ACHIEVEMENT_ICON_MAP[key] ?? Award;
}

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
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [validationStats, setValidationStats] = useState({
    total_successful: 0, total_attempts: 0, success_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);

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
        const [profileStats, xp, detailed, achievementList] = await Promise.all([
          fetchProfileStats(),
          fetchXpInfo(),
          fetchDetailedStats(),
          fetchAchievements(),
        ]);

        setStats(profileStats);
        setXpInfo(xp);
        setRecords(detailed.records);
        setTotalCompleted(detailed.summary.total_completed);
        setValidationStats(detailed.validations);
        setAchievements(achievementList);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos del perfil.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const unlockedCount = useMemo(() => {
    return achievements.filter((a) => a.earned).length;
  }, [achievements]);

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

  async function handleDeleteAccount() {
    await deleteAccount();
    clearSession();
    router.push("/login");
  }

  if (error) {
    return (
      <div className="py-6 space-y-6 max-w-lg mx-auto px-4 @container">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
            <p className="text-sm text-muted-foreground">Tu progreso y logros</p>
          </div>
        </div>

        <ClayMotionBox className="p-6 space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Perfil no disponible</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
        </ClayMotionBox>
      </div>
    );
  }

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
          <p className="text-2xl font-bold text-foreground">{unlockedCount}/{achievements.length}</p>
          <p className="text-xs text-muted-foreground">Total logros</p>
        </ClayMotionBox>
      </div>

      {/* Logros */}
      <ClayMotionBox className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Logros</h2>
          <span className="text-xs text-muted-foreground">{unlockedCount} de {achievements.length}</span>
        </div>

        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Cargando logros...
          </p>
        ) : (
          <div className="grid grid-cols-3 @xs:grid-cols-4 gap-3">
            {achievements.map((ach) => {
              const IconComp = getAchievementIcon(ach.key);
              return (
                <div
                  key={ach.key}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all relative",
                    ach.earned
                      ? "bg-gradient-to-br from-yellow-600 to-orange-600 text-white shadow-inner shadow-orange-700/30"
                      : "bg-secondary text-muted-foreground opacity-50"
                  )}
                  title={ach.description ?? ach.name}
                >
                  <span className="text-xl leading-none">{ach.emoji}</span>
                  <IconComp className="size-4" />
                  <span className="text-[9px] font-medium text-center leading-tight">
                    {ach.name}
                  </span>
                  {ach.earned && ach.xp_bonus > 0 && (
                    <span className="text-[8px] font-bold text-yellow-200">
                      +{ach.xp_bonus} XP
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
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

        {/* Danger zone */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Trash2 className="size-4 text-red-500" />
            <span className="text-sm text-red-500 font-medium">Eliminar cuenta</span>
          </div>
          <ChevronRight className="size-4 text-red-500/50" />
        </button>
      </ClayMotionBox>

      {/* Delete account confirmation modal */}
      <ConfirmDeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
