"use client";

import Link from "next/link";
import { useState, useEffect, memo } from "react";
import {
  Flame,
  TrendingUp,
  Trophy,
  Target,
  Calendar,
  Zap,
  BarChart3,
  icons,
} from "lucide-react";
import { fetchDetailedStats } from "@/services/stats/statsService";
import { getStatsViewState } from "@/services/stats/statsViewState";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";

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

const CompletionRing = memo(function CompletionRing({ rate }: { rate: number }) {
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
          stroke="currentColor"
          strokeWidth="8"
          className="text-border"
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
        <span className="text-3xl font-bold text-foreground">{rate}%</span>
        <span className="text-[10px] text-muted-foreground">completado</span>
      </div>
    </div>
  );
});

/* ── Weekly Bar Chart ─────────────────────────── */

const WeeklyChart = memo(function WeeklyChart({ data }: { data: WeekDay[] }) {
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
            <div className="w-full h-24 bg-secondary rounded-lg relative overflow-hidden">
              <div
                className={`absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-700 ease-out ${
                  isToday
                    ? "bg-gradient-to-t from-primary to-[#8B5CF6]"
                    : "bg-gradient-to-t from-primary/60 to-[#8B5CF6]/40"
                }`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <span
              className={`text-[10px] font-medium ${
                isToday ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
});

/* ── Streak Calendar (30‑day heatmap) ──────── */

const StreakCalendar = memo(function StreakCalendar({ data }: { data: CalendarDay[] }) {
  const intensityColors = [
    "bg-secondary",
    "bg-primary/30",
    "bg-primary/60",
    "bg-primary",
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
});

/* ── Main Page ────────────────────────────────── */

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function fetchStats() {
    try {
      const data = await fetchDetailedStats();
      setStats(data);
      setErrorMessage(null);
    } catch (error) {
      setStats(null);
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "No se pudieron cargar tus estadísticas reales. Intenta de nuevo en unos momentos.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const viewState = getStatsViewState(stats, errorMessage);

  if (viewState.kind === "empty" || viewState.kind === "error") {
    return (
      <div className="py-6 space-y-6 max-w-lg mx-auto px-4 @container">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>
          <p className="text-sm text-muted-foreground">Tu progreso en detalle</p>
        </div>

        <ClayMotionBox className="p-6 space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{viewState.title}</h2>
            <p className="text-sm text-muted-foreground">{viewState.message}</p>
          </div>

          {viewState.kind === "empty" ? (
            <Link
              href="/habits/new"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Agregar hábito del catálogo
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void fetchStats();
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Reintentar
            </button>
          )}
        </ClayMotionBox>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const summary = stats.summary;
  const weekly = stats.weekly_history;
  const perHabit = stats.per_habit;
  const calendar = stats.calendar;
  const records = stats.records;

  return (
    <div className="py-6 space-y-6 max-w-lg mx-auto px-4 @container">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>
        <p className="text-sm text-muted-foreground">Tu progreso en detalle</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <ClayMotionBox className="p-3 text-center space-y-1 !rounded-2xl">
          <Flame className="size-5 text-orange-400 mx-auto" />
          <p className="text-xs text-muted-foreground">Racha</p>
          <p className="text-lg font-bold text-foreground">
            {summary.streak} <span className="text-xs font-normal text-muted-foreground">días</span>
          </p>
        </ClayMotionBox>
        <ClayMotionBox className="p-3 text-center space-y-1 !rounded-2xl">
          <TrendingUp className="size-5 text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Tasa</p>
          <p className="text-lg font-bold text-foreground">
            {summary.completion_rate}<span className="text-xs font-normal text-muted-foreground">%</span>
          </p>
        </ClayMotionBox>
        <ClayMotionBox className="p-3 text-center space-y-1 !rounded-2xl">
          <Target className="size-5 text-green-400 mx-auto" />
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-foreground">{summary.total_completed}</p>
        </ClayMotionBox>
      </div>

      {/* Completion Ring + Weekly Chart side by side on larger screens */}
      <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
        {/* Weekly Bar Chart */}
        <ClayMotionBox className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Actividad semanal
            </h2>
          </div>
          <WeeklyChart data={weekly} />
        </ClayMotionBox>

        {/* Completion Ring */}
        <ClayMotionBox className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground text-center">
            Tasa de completado
          </h2>
          <CompletionRing rate={summary.completion_rate} />
          <p className="text-xs text-muted-foreground text-center">
            Últimos 7 días
          </p>
        </ClayMotionBox>
      </div>

      {/* Per-habit Breakdown */}
      {perHabit.length > 0 ? (
        <ClayMotionBox className="p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Desglose por hábito
          </h2>
          <div className="space-y-3">
            {perHabit.map((h) => {
              const IconComp = icons[h.icon as keyof typeof icons] || icons.Circle;
              return (
              <div key={h.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base text-primary"><IconComp className="size-5" /></span>
                    <span className="text-sm text-foreground font-medium">
                      {h.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {h.completed}/{h.total} días
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-[#A855F7] transition-all duration-700 ease-out"
                    style={{ width: `${h.rate}%` }}
                  />
                </div>
              </div>
            )})}
          </div>
        </ClayMotionBox>
      ) : null}

      {/* 30-day Calendar */}
      <ClayMotionBox className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Últimos 30 días
          </h2>
        </div>
        <StreakCalendar data={calendar} />
        <div className="flex items-center justify-end gap-2 pt-1">
          <span className="text-[9px] text-muted-foreground">Menos</span>
          <div className="flex gap-1">
            <div className="size-3 rounded-[2px] bg-secondary" />
            <div className="size-3 rounded-[2px] bg-primary/30" />
            <div className="size-3 rounded-[2px] bg-primary/60" />
            <div className="size-3 rounded-[2px] bg-primary" />
          </div>
          <span className="text-[9px] text-muted-foreground">Más</span>
        </div>
      </ClayMotionBox>

      {/* Records */}
      <ClayMotionBox className="p-0 overflow-hidden divide-y divide-border">
        <div className="flex items-center gap-2 px-4 py-4">
          <Trophy className="size-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-foreground">Récords personales</h2>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <Flame className="size-5 text-orange-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Racha más larga</p>
            <p className="text-xs text-muted-foreground">Tu mejor marca</p>
          </div>
          <span className="text-lg font-bold text-foreground">
            {records.longest_streak} <span className="text-xs font-normal text-muted-foreground">días</span>
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <Zap className="size-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Mejor día</p>
            <p className="text-xs text-muted-foreground">Más hábitos en un día</p>
          </div>
          <span className="text-lg font-bold text-foreground">{records.best_day}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <TrendingUp className="size-5 text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Racha actual</p>
            <p className="text-xs text-muted-foreground">Días consecutivos</p>
          </div>
          <span className="text-lg font-bold text-foreground">
            {records.current_streak} <span className="text-xs font-normal text-muted-foreground">días</span>
          </span>
        </div>
      </ClayMotionBox>
    </div>
  );
}
