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

const EMPTY_STATS: StatsSummary = {
  streak: 0,
  today_completed: 0,
  today_total: 0,
  completion_rate: 0,
  total_xp: 0,
  level: 1,
  validations_today: 0,
};

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
  { key: "fire", label: "Fuego", Icon: Flame },
  { key: "candle", label: "Vela", Icon: Timer },
  { key: "ice", label: "Hielo", Icon: Snowflake },
  { key: "hourglass", label: "Reloj", Icon: Hourglass },
];

export default function DashboardHomePage() {
  const [stats, setStats] = useState<StatsSummary>(EMPTY_STATS);
  const [todayHabits, setTodayHabits] = useState<TodayHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingHabitId, setUpdatingHabitId] = useState<number | null>(null);

  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }

    try {
      const [statsData, habitsData] = await Promise.all([
        fetchStatsSummary(),
        fetchTodayHabits(),
      ]);

      setStats(statsData);
      setTodayHabits(habitsData);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error && err.message.trim()
          ? err.message
          : "No se pudieron cargar tus datos reales. Intenta de nuevo en unos momentos.",
      );
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData(true);
  }, [fetchData]);

  async function handleToggleHabit(habitId: number) {
    setUpdatingHabitId(habitId);
    setError("");

    try {
      const result = await toggleCheckin({ habit_id: habitId });

      setTodayHabits((currentHabits) =>
        currentHabits.map((habit) =>
          habit.id === result.habit_id ? { ...habit, checked_today: result.checked } : habit,
        ),
      );

      try {
        setStats(await fetchStatsSummary());
      } catch (err) {
        setError(
          err instanceof Error && err.message.trim()
            ? `${err.message} El check-in sí se guardó correctamente.`
            : "El check-in se guardó, pero no se pudieron refrescar las estadísticas.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message.trim()
          ? err.message
          : "No se pudo actualizar el check-in.",
      );
    } finally {
      setUpdatingHabitId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && todayHabits.length === 0 && stats === EMPTY_STATS) {
    return (
      <div className="py-6 space-y-6 max-w-lg mx-auto px-4 @container">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Streak Up</h1>
          <p className="text-sm text-clay-frozen font-medium capitalize">{formatDate()}</p>
        </div>

        <ClayMotionBox variant="frozen" active={false} className="p-6 space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Inicio no disponible</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData(true)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
        </ClayMotionBox>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8 max-w-lg mx-auto px-4 @container">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Streak Up</h1>
        <p className="text-sm text-clay-frozen font-medium capitalize">{formatDate()}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <ClayMotionBox variant="primary" active={false} className="p-4 text-center space-y-1">
          <div className="flex justify-center mb-1">
            <Flame className="size-6 text-orange-400 drop-shadow-md" />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Racha</p>
          <p className="text-xl font-black text-foreground">{stats.streak}</p>
        </ClayMotionBox>

        <ClayMotionBox variant="primary" active={false} className="p-4 text-center space-y-1">
          <div className="flex justify-center mb-1">
            <Clock className="size-6 text-clay-blue drop-shadow-md" />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Hoy</p>
          <p className="text-xl font-black text-foreground">
            {stats.today_completed}/{stats.today_total}
          </p>
        </ClayMotionBox>

        <ClayMotionBox variant="primary" active={false} className="p-4 text-center space-y-1">
          <div className="flex justify-center mb-1">
            <TrendingUp className="size-6 text-clay-purple drop-shadow-md" />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Tasa</p>
          <p className="text-xl font-black text-foreground">{stats.completion_rate}%</p>
        </ClayMotionBox>
      </div>

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
                onClick={() => {
                  if (updatingHabitId === null) {
                    void handleToggleHabit(habit.id);
                  }
                }}
                active={habit.checked_today}
                variant={habit.checked_today ? "vibrant-orange" : "frozen"}
                className={`flex flex-col items-center justify-center gap-3 text-center min-h-[140px] ${
                  updatingHabitId === habit.id ? "cursor-wait opacity-70" : "cursor-pointer"
                }`}
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
                  <p className="text-sm font-bold leading-tight">{habit.name}</p>
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
