"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Flame, Clock, TrendingUp, Plus, Check } from "lucide-react";
import { fetchTodayHabits, toggleCheckin } from "@/services/checkins/checkinService";
import { fetchStatsSummary } from "@/services/stats/statsService";
import type { TodayHabit } from "@/types/checkins";
import type { StatsSummary } from "@/types/stats";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  };
  return now.toLocaleDateString("es-MX", options);
}

interface Stats {
  streak: number;
  today_completed: number;
  today_total: number;
  completion_rate: number;
}

interface TodayHabit {
  id: number;
  name: string;
  icon: string;
  checked_today: boolean;
  section: string;
}

const POMODORO_THEMES = [
  { key: "fire", label: "Fuego", emoji: "🔥", bg: "bg-orange-950/60", border: "border-orange-800/40" },
  { key: "candle", label: "Vela", emoji: "🕯️", bg: "bg-purple-950/60", border: "border-purple-800/40" },
  { key: "ice", label: "Hielo", emoji: "🧊", bg: "bg-blue-950/60", border: "border-blue-800/40" },
  { key: "hourglass", label: "Reloj", emoji: "⏳", bg: "bg-amber-950/60", border: "border-amber-800/40" },
];

export default function DashboardHomePage() {
  const [stats, setStats] = useState<StatsSummary>({ streak: 0, today_completed: 0, today_total: 0, completion_rate: 0 });
  const [stats, setStats] = useState<Stats>({ streak: 0, today_completed: 0, today_total: 0, completion_rate: 0 });
  const [todayHabits, setTodayHabits] = useState<TodayHabit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, habitsData] = await Promise.all([
        fetchStatsSummary(),
        fetchTodayHabits(),
      ]);
      setStats(statsData);
      setTodayHabits(habitsData);
    } catch {
      setStats({ streak: 0, today_completed: 0, today_total: 0, completion_rate: 0 });
      setTodayHabits([]);
      const [statsRes, habitsRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/summary`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/checkins/today`, { headers: getAuthHeaders() }),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (habitsRes.ok) {
        setTodayHabits(await habitsRes.json());
      }
    } catch {
      // silently fail — data will show defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleHabit(habitId: number) {
    try {
      await toggleCheckin({ habit_id: habitId });
      const [statsData, habitsData] = await Promise.all([fetchStatsSummary(), fetchTodayHabits()]);
      setStats(statsData);
      setTodayHabits(habitsData);
      const res = await fetch(`${API_URL}/api/checkins/toggle`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ habit_id: habitId }),
      });

      if (res.ok) {
        setTodayHabits((prev) =>
          prev.map((h) =>
            h.id === habitId ? { ...h, checked_today: !h.checked_today } : h
          )
        );
        // Refresh stats
        const statsRes = await fetch(`${API_URL}/api/stats/summary`, { headers: getAuthHeaders() });
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch {
      // silently fail
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
    <div className="py-6 space-y-6 max-w-lg mx-auto px-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Streak Up</h1>
        <p className="text-sm text-muted-foreground capitalize">{formatDate()}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Racha */}
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-3 text-center space-y-1">
          <div className="flex justify-center">
            <Flame className="size-5 text-orange-400" />
          </div>
          <p className="text-xs text-muted-foreground">Racha</p>
          <p className="text-lg font-bold text-white">{stats.streak} días</p>
        </div>

        {/* Hoy */}
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-3 text-center space-y-1">
          <div className="flex justify-center">
            <Clock className="size-5 text-[#5D5FEF]" />
          </div>
          <p className="text-xs text-muted-foreground">Hoy</p>
          <p className="text-lg font-bold text-white">
            {stats.today_completed}/{stats.today_total}
          </p>
        </div>

        {/* Tasa */}
        <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-3 text-center space-y-1">
          <div className="flex justify-center">
            <TrendingUp className="size-5 text-purple-400" />
          </div>
          <p className="text-xs text-muted-foreground">Tasa</p>
          <p className="text-lg font-bold text-white">{stats.completion_rate}%</p>
        </div>
      </div>

      {/* Modo Pomodoro */}
      <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-white">Modo Pomodoro</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {POMODORO_THEMES.map((theme) => (
            <Link
              key={theme.key}
              href={`/pomodoro?theme=${theme.key}`}
              className={`flex flex-col items-center gap-2 rounded-xl ${theme.bg} border ${theme.border} p-4 transition-all hover:scale-[1.02] active:scale-95`}
            >
              <span className="text-2xl">{theme.emoji}</span>
              <span className="text-xs font-medium text-white">{theme.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Hoy - Habits */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Hoy</h2>
          <Link
            href="/habits/new"
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <Plus className="size-5" />
          </Link>
        </div>

        {todayHabits.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No tienes hábitos diarios aún.
            </p>
            <Link
              href="/habits/new"
              className="mt-2 inline-block text-sm text-[#5D5FEF] hover:text-[#7B7DF7] font-medium"
            >
              Crear tu primer hábito →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todayHabits.map((habit) => (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`w-full flex items-center gap-3 rounded-xl border p-4 transition-all active:scale-[0.98] ${
                  habit.checked_today
                    ? "border-[#5D5FEF]/30 bg-[#5D5FEF]/10"
                    : "border-[#2A2A3E] bg-[#111127] hover:bg-[#1A1A2E]"
                }`}
              >
                <span className="text-xl">{habit.icon}</span>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${habit.checked_today ? "text-white" : "text-white"}`}>
                    {habit.name}
                  </p>
                </div>
                <div
                  className={`size-6 rounded-full flex items-center justify-center transition-colors ${
                    habit.checked_today
                      ? "bg-[#5D5FEF] text-white"
                      : "border-2 border-[#2A2A3E]"
                  }`}
                >
                  {habit.checked_today && <Check className="size-3.5" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
