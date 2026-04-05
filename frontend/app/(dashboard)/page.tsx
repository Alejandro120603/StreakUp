"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Flame, Clock, TrendingUp, Plus, Check, Timer, Snowflake, Hourglass, icons } from "lucide-react";
import { fetchTodayHabits, toggleCheckin } from "@/services/checkins/checkinService";
import { fetchStatsSummary } from "@/services/stats/statsService";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";
import { SECTION_ICONS } from "@/types/habits";
import type { TodayHabit } from "@/types/checkins";
import type { StatsSummary } from "@/types/stats";

function formatDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  };
  return now.toLocaleDateString("es-MX", options);
}

const POMODORO_THEMES = [
  { key: "fire", label: "Fuego", Icon: Flame, bg: "bg-orange-950/60", border: "border-orange-800/40" },
  { key: "candle", label: "Vela", Icon: Timer, bg: "bg-purple-950/60", border: "border-purple-800/40" },
  { key: "ice", label: "Hielo", Icon: Snowflake, bg: "bg-blue-950/60", border: "border-blue-800/40" },
  { key: "hourglass", label: "Reloj", Icon: Hourglass, bg: "bg-amber-950/60", border: "border-amber-800/40" },
];

export default function DashboardHomePage() {
  const [stats, setStats] = useState<StatsSummary>({ streak: 0, today_completed: 0, today_total: 0, completion_rate: 0, total_xp: 0, level: 1, validations_today: 0 });
  const [todayHabits, setTodayHabits] = useState<TodayHabit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, habitsData] = await Promise.all([
        fetchStatsSummary(),
        fetchTodayHabits(),
      ]);
      setStats(statsData as StatsSummary);
      setTodayHabits(habitsData);
    } catch {
      setStats({ streak: 0, today_completed: 0, today_total: 0, completion_rate: 0, total_xp: 0, level: 1, validations_today: 0 });
      setTodayHabits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleHabit(habitId: number) {
    try {
      // Optimistic update
      setTodayHabits(prev => prev.map(h => h.id === habitId ? { ...h, checked_today: !h.checked_today } : h));
      await toggleCheckin({ habit_id: habitId });
      
      // We don't block the UI while re-validating the server side details silently
      Promise.all([fetchStatsSummary(), fetchTodayHabits()]).then(([statsData, habitsData]) => {
        setStats(statsData);
        setTodayHabits(habitsData);
      }).catch(() => {
        // Failing silently is better for optimistic UI on minor tracking updates
      });
    } catch {
      // Revert if failed
      fetchData();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8 max-w-lg mx-auto px-4 @container">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Streak Up</h1>
        <p className="text-sm text-clay-frozen font-medium capitalize">{formatDate()}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Racha */}
        <ClayMotionBox variant="primary" active={false} className="p-4 text-center space-y-1">
          <div className="flex justify-center mb-1">
            <Flame className="size-6 text-orange-400 drop-shadow-md" />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Racha</p>
          <p className="text-xl font-black text-foreground">{stats.streak}</p>
        </ClayMotionBox>

        {/* Hoy */}
        <ClayMotionBox variant="primary" active={false} className="p-4 text-center space-y-1">
          <div className="flex justify-center mb-1">
            <Clock className="size-6 text-clay-blue drop-shadow-md" />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Hoy</p>
          <p className="text-xl font-black text-foreground">
            {stats.today_completed}/{stats.today_total}
          </p>
        </ClayMotionBox>

        {/* Tasa */}
        <ClayMotionBox variant="primary" active={false} className="p-4 text-center space-y-1">
          <div className="flex justify-center mb-1">
            <TrendingUp className="size-6 text-clay-purple drop-shadow-md" />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Tasa</p>
          <p className="text-xl font-black text-foreground">{stats.completion_rate}%</p>
        </ClayMotionBox>
      </div>

      {/* Modo Pomodoro */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-clay-frozen" />
          <h2 className="text-lg font-bold text-foreground">Modo Pomodoro</h2>
        </div>
        <div className="grid grid-cols-2 @xs:grid-cols-4 gap-3">
          {POMODORO_THEMES.map((theme) => (
            <Link key={theme.key} href={`/pomodoro?theme=${theme.key}`}>
              <ClayMotionBox variant="primary" className="flex flex-col items-center gap-2 p-5 text-center cursor-pointer">
                <span className="flex items-center justify-center text-primary drop-shadow-lg"><theme.Icon className="size-8" /></span>
                <span className="text-xs font-bold text-foreground">{theme.label}</span>
              </ClayMotionBox>
            </Link>
          ))}
        </div>
      </div>

      {/* Hoy - Habits */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Mis Hábitos</h2>
          <Link
            href="/habits/new"
            className="flex items-center justify-center p-2 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            <Plus className="size-5" />
          </Link>
        </div>

        {todayHabits.length === 0 ? (
          <ClayMotionBox variant="frozen" active={false} className="text-center p-8 text-foreground/80">
            <p className="text-sm mb-3">No tienes hábitos diarios aún.</p>
            <Link
              href="/habits/new"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-clay-blue text-white font-bold text-sm"
            >
              Crear tu primer hábito
            </Link>
          </ClayMotionBox>
        ) : (
          <div className="grid grid-cols-2 @md:grid-cols-3 gap-4">
            {todayHabits.map((habit) => (
              <ClayMotionBox
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                active={habit.checked_today}
                variant={habit.checked_today ? "vibrant-orange" : "frozen"}
                className="flex flex-col items-center justify-center gap-3 text-center cursor-pointer min-h-[140px]"
                role="button"
              >
                <div className="flex items-center justify-center p-3 text-primary drop-shadow-xl">
                  {(() => {
                    let IconComp = icons.Circle;
                    if (habit.icon && icons[habit.icon as keyof typeof icons]) {
                      IconComp = icons[habit.icon as keyof typeof icons] as never;
                    } else {
                      const sectionKey = SECTION_ICONS[habit.section];
                      if (sectionKey && icons[sectionKey as keyof typeof icons]) {
                        IconComp = icons[sectionKey as keyof typeof icons] as never;
                      }
                    }
                    return <IconComp className="size-10" />;
                  })()}
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">
                    {habit.name}
                  </p>
                </div>
                {habit.checked_today ? (
                  <div className="absolute top-3 right-3 bg-white/20 rounded-full p-1 shadow-inner">
                    <Check className="size-4 text-white drop-shadow" />
                  </div>
                ) : null}
              </ClayMotionBox>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
