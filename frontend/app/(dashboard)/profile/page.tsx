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
} from "lucide-react";
import { getSession } from "@/services/auth/authService";
import { fetchProfileStats } from "@/services/stats/statsService";
import type { AuthUser } from "@/types/auth";
import type { ProfileStats } from "@/types/stats";

const ACHIEVEMENTS = [
  { name: "Principiante", icon: Zap, color: "bg-blue-600", unlocked: true },
  { name: "Consistente", icon: Flame, color: "bg-yellow-600", unlocked: true },
  { name: "Dedicado", icon: Award, color: "bg-green-600", unlocked: true },
  { name: "Imparable", icon: Target, color: "bg-orange-600", unlocked: true },
  { name: "Maestro", icon: Crown, color: "bg-red-600", unlocked: true },
  { name: "Leyenda", icon: Gem, color: "bg-purple-600/40", unlocked: false },
  { name: "Perfeccionista", icon: Sparkles, color: "bg-teal-600/40", unlocked: false },
  { name: "Inspirador", icon: Star, color: "bg-amber-600/40", unlocked: false },
];

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    streak: 0, today_completed: 0, today_total: 0, completion_rate: 0, habits_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const session = getSession();
      if (session) {
        setUser(session.user);
      }

      try {
        setStats(await fetchProfileStats());
      } catch {
        setStats({
          streak: 0,
          today_completed: 0,
          today_total: 0,
          completion_rate: 0,
          habits_count: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute level from XP (simple: 1 level per 5 habits completed)
  const xp = stats.streak * 50 + stats.today_completed * 25;
  const level = Math.floor(xp / 250) + 1;
  const xpInLevel = xp % 250;
  const xpForNextLevel = 250;
  const xpProgress = (xpInLevel / xpForNextLevel) * 100;

  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length;

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
                🏆 Nivel {level}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Racha actual: {stats.streak} días 🔥
            </p>
            {/* XP Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Experiencia</span>
                <span>{xpInLevel} / {xpForNextLevel} XP</span>
              </div>
              <div className="h-2 rounded-full bg-[#2A2A3E] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
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
          <p className="text-2xl font-bold text-white">{stats.streak * 7}</p>
          <p className="text-xs text-muted-foreground">Días activos</p>
        </div>
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-1">
          <Flame className="size-5 text-orange-400" />
          <p className="text-2xl font-bold text-white">{stats.streak}</p>
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
          {ACHIEVEMENTS.map((ach) => (
            <div
              key={ach.name}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all ${
                ach.unlocked
                  ? `${ach.color} border border-white/10`
                  : "bg-[#111127] border border-[#2A2A3E] opacity-50"
              }`}
            >
              <ach.icon className={`size-5 ${ach.unlocked ? "text-white" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium text-center leading-tight ${ach.unlocked ? "text-white" : "text-muted-foreground"}`}>
                {ach.name}
              </span>
            </div>
          ))}
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
            <span className="text-lg font-bold text-white">{stats.streak} días</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Calendar className="size-5 text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Mejor semana</p>
              <p className="text-xs text-muted-foreground">Tasa de finalización</p>
            </div>
            <span className="text-lg font-bold text-white">{stats.completion_rate}%</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Zap className="size-5 text-[#5D5FEF]" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Más hábitos en un día</p>
              <p className="text-xs text-muted-foreground">Día más productivo</p>
            </div>
            <span className="text-lg font-bold text-white">{stats.today_total}</span>
          </div>
        </div>
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
