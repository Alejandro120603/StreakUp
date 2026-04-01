"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Flame,
  TrendingUp,
  Trophy,
  Target,
  Calendar,
  Zap,
  BarChart3,
} from "lucide-react";
import { shouldUseOfflineFallback } from "@/services/api/client";
import { fetchDetailedStats } from "@/services/stats/statsService";

/* ── Types ────────────────────────────────────── */

interface Summary {
  streak: number;
  completion_rate: number;
  total_completed: number;
  total_habits: number;
}

interface WeekDay {
  date: string;
  label: string;
  completed: number;
  total: number;
}

interface HabitStat {
  id: number;
  name: string;
  icon: string;
  completed: number;
  total: number;
  rate: number;
}

interface CalendarDay {
  date: string;
  count: number;
  intensity: number; // 0-3
}

interface Records {
  longest_streak: number;
  best_day: number;
  current_streak: number;
}

interface StatsData {
  summary: Summary;
  weekly_history: WeekDay[];
  per_habit: HabitStat[];
  calendar: CalendarDay[];
  records: Records;
}

/* ── Completion Ring ──────────────────────────── */

function CompletionRing({ rate }: { rate: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - rate / 100);

  return (
    <div className="relative size-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#2A2A3E"
          strokeWidth="8"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5D5FEF" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{rate}%</span>
        <span className="text-[10px] text-muted-foreground">completado</span>
      </div>
    </div>
  );
}

/* ── Weekly Bar Chart ─────────────────────────── */

function WeeklyChart({ data }: { data: WeekDay[] }) {
  const maxVal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((day) => {
        const pct = maxVal > 0 ? (day.completed / maxVal) * 100 : 0;
        const isToday =
          day.date === new Date().toISOString().split("T")[0];
        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <span className="text-[10px] text-muted-foreground font-medium">
              {day.completed}
            </span>
            <div className="w-full h-24 bg-[#1A1A2E] rounded-lg relative overflow-hidden">
              <div
                className={`absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-700 ease-out ${
                  isToday
                    ? "bg-gradient-to-t from-[#5D5FEF] to-[#8B5CF6]"
                    : "bg-gradient-to-t from-[#5D5FEF]/60 to-[#8B5CF6]/40"
                }`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <span
              className={`text-[10px] font-medium ${
                isToday ? "text-[#5D5FEF]" : "text-muted-foreground"
              }`}
            >
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Streak Calendar (30‑day heatmap) ──────── */

function StreakCalendar({ data }: { data: CalendarDay[] }) {
  const intensityColors = [
    "bg-[#1A1A2E]",
    "bg-[#5D5FEF]/30",
    "bg-[#5D5FEF]/60",
    "bg-[#5D5FEF]",
  ];

  return (
    <div className="grid grid-cols-10 gap-1.5">
      {data.map((day) => (
        <div
          key={day.date}
          title={`${day.date}: ${day.count} completados`}
          className={`aspect-square rounded-[4px] ${
            intensityColors[day.intensity]
          } transition-colors`}
        />
      ))}
    </div>
  );
}

/* ── Demo Data (datos ficticios) ─────────────── */

function generateDemoData(): StatsData {
  const today = new Date();
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const weeklyCompleted = [3, 4, 2, 5, 4, 3, 1];

  const weekly_history: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    weekly_history.push({
      date: d.toISOString().split("T")[0],
      label: dayNames[d.getDay()],
      completed: weeklyCompleted[6 - i],
      total: 5,
    });
  }

  const per_habit: HabitStat[] = [
    { id: 1, name: "Ejercicio", icon: "🏋️", completed: 6, total: 7, rate: 86 },
    { id: 2, name: "Leer 30 min", icon: "📖", completed: 5, total: 7, rate: 71 },
    { id: 3, name: "Meditar", icon: "🧘", completed: 4, total: 7, rate: 57 },
    { id: 4, name: "Beber agua", icon: "💧", completed: 7, total: 7, rate: 100 },
    { id: 5, name: "Estudiar", icon: "📚", completed: 3, total: 7, rate: 43 },
  ];

  const calendar: CalendarDay[] = [];
  const intensityPattern = [0,1,2,3,3,2,1,0,1,3,3,2,0,0,1,2,3,3,2,1,0,1,2,3,3,2,1,1,2,3];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const intensity = intensityPattern[29 - i];
    calendar.push({
      date: d.toISOString().split("T")[0],
      count: intensity * 2,
      intensity,
    });
  }

  return {
    summary: {
      streak: 12,
      completion_rate: 73,
      total_completed: 156,
      total_habits: 5,
    },
    weekly_history,
    per_habit,
    calendar,
    records: {
      longest_streak: 21,
      best_day: 5,
      current_streak: 12,
    },
  };
}

const DEMO_DATA = generateDemoData();

/* ── Main Page ────────────────────────────────── */

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await fetchDetailedStats();

      if (data.summary.total_habits > 0) {
        setStats(data);
        setUsingDemo(false);
      } else {
        setStats(DEMO_DATA);
        setUsingDemo(true);
      }
    } catch (error) {
      if (shouldUseOfflineFallback(error)) {
        setStats(DEMO_DATA);
        setUsingDemo(true);
      } else {
        setStats(null);
        setUsingDemo(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const summary = stats?.summary ?? DEMO_DATA.summary;
  const weekly = stats?.weekly_history ?? DEMO_DATA.weekly_history;
  const perHabit = stats?.per_habit ?? DEMO_DATA.per_habit;
  const calendar = stats?.calendar ?? DEMO_DATA.calendar;
  const records = stats?.records ?? DEMO_DATA.records;

  return (
    <div className="py-6 space-y-6 max-w-lg mx-auto px-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Estadísticas</h1>
        <p className="text-sm text-muted-foreground">Tu progreso en detalle</p>
      </div>

      {/* Demo data indicator */}
      {usingDemo && (
        <div className="rounded-lg border border-[#5D5FEF]/30 bg-[#5D5FEF]/10 px-4 py-2.5 text-xs text-[#8B8BFF]">
          📊 Mostrando datos ficticios de ejemplo. Crea hábitos y complétalos para ver tus estadísticas reales.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-3 text-center space-y-1">
          <Flame className="size-5 text-orange-400 mx-auto" />
          <p className="text-xs text-muted-foreground">Racha</p>
          <p className="text-lg font-bold text-white">
            {summary.streak} <span className="text-xs font-normal text-muted-foreground">días</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-3 text-center space-y-1">
          <TrendingUp className="size-5 text-[#5D5FEF] mx-auto" />
          <p className="text-xs text-muted-foreground">Tasa</p>
          <p className="text-lg font-bold text-white">
            {summary.completion_rate}<span className="text-xs font-normal text-muted-foreground">%</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-3 text-center space-y-1">
          <Target className="size-5 text-green-400 mx-auto" />
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-white">{summary.total_completed}</p>
        </div>
      </div>

      {/* Completion Ring + Weekly Chart side by side on larger screens */}
      <div className="grid grid-cols-1 gap-4">
        {/* Weekly Bar Chart */}
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-white">
              Actividad semanal
            </h2>
          </div>
          <WeeklyChart data={weekly} />
        </div>

        {/* Completion Ring */}
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white text-center">
            Tasa de completado
          </h2>
          <CompletionRing rate={summary.completion_rate} />
          <p className="text-xs text-muted-foreground text-center">
            Últimos 7 días
          </p>
        </div>
      </div>

      {/* Per-habit Breakdown */}
      {perHabit.length > 0 && (
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-4">
          <h2 className="text-sm font-semibold text-white">
            Desglose por hábito
          </h2>
          <div className="space-y-3">
            {perHabit.map((h) => (
              <div key={h.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{h.icon}</span>
                    <span className="text-sm text-white font-medium">
                      {h.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {h.completed}/{h.total} días
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#1A1A2E] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5D5FEF] to-[#A855F7] transition-all duration-700 ease-out"
                    style={{ width: `${h.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-day Calendar */}
      <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-white">
            Últimos 30 días
          </h2>
        </div>
        <StreakCalendar data={calendar} />
        <div className="flex items-center justify-end gap-2 pt-1">
          <span className="text-[9px] text-muted-foreground">Menos</span>
          <div className="flex gap-1">
            <div className="size-3 rounded-[2px] bg-[#1A1A2E]" />
            <div className="size-3 rounded-[2px] bg-[#5D5FEF]/30" />
            <div className="size-3 rounded-[2px] bg-[#5D5FEF]/60" />
            <div className="size-3 rounded-[2px] bg-[#5D5FEF]" />
          </div>
          <span className="text-[9px] text-muted-foreground">Más</span>
        </div>
      </div>

      {/* Records */}
      <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] divide-y divide-[#2A2A3E]">
        <div className="flex items-center gap-2 px-4 py-3">
          <Trophy className="size-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-white">Récords personales</h2>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Flame className="size-5 text-orange-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Racha más larga</p>
            <p className="text-xs text-muted-foreground">Tu mejor marca</p>
          </div>
          <span className="text-lg font-bold text-white">
            {records.longest_streak} <span className="text-xs font-normal text-muted-foreground">días</span>
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Zap className="size-5 text-[#5D5FEF]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Mejor día</p>
            <p className="text-xs text-muted-foreground">Más hábitos en un día</p>
          </div>
          <span className="text-lg font-bold text-white">{records.best_day}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <TrendingUp className="size-5 text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Racha actual</p>
            <p className="text-xs text-muted-foreground">Días consecutivos</p>
          </div>
          <span className="text-lg font-bold text-white">
            {records.current_streak} <span className="text-xs font-normal text-muted-foreground">días</span>
          </span>
        </div>
      </div>
    </div>
  );
}
