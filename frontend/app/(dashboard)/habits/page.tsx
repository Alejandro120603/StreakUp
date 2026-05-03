"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Camera, icons } from "lucide-react";
import { fetchHabits, deleteHabit } from "@/services/habits/habitService";
import type { Habit } from "@/types/habits";
import { getHabitTargetSummary, SECTION_ICONS, VALIDATION_TYPE_LABELS } from "@/types/habits";
import { Button } from "@/components/ui/button";

const DIFFICULTY_LABELS: Record<string, string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  facil: "bg-emerald-500/20 text-emerald-200",
  media: "bg-amber-500/20 text-amber-200",
  dificil: "bg-red-500/20 text-red-200",
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadHabits() {
    try {
      setLoading(true);
      const data = await fetchHabits();
      setHabits(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error && err.message.trim()
          ? err.message
          : "No se pudieron cargar los hábitos.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHabits();
  }, []);

  async function handleDelete(id: number) {
    setDeleting(true);
    setError("");
    try {
      await deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setConfirmingDeleteId(null);
    } catch (err) {
      setError(
        err instanceof Error && err.message.trim()
          ? err.message
          : "No se pudo eliminar el hábito.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-[24px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-[14px]">
        <div>
          <h2 className="text-[30px] leading-[1.05] font-bold">Mis Hábitos</h2>
          <p className="text-white/74 text-[15px]">
            {habits.length} hábito{habits.length !== 1 ? "s" : ""} activo
            {habits.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button 
          onClick={() => window.location.href = "/habits/new"}
          className="w-[48px] h-[48px] rounded-full bg-white/18 text-[24px] grid place-items-center cursor-pointer transition-transform active:scale-95"
        >
          <Plus className="size-6 text-white" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="size-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && habits.length === 0 && !error && (
        <div className="text-center p-8 bg-white/10 rounded-[24px] border border-white/20">
          <p className="text-white/80 mb-4">No tienes hábitos aún.</p>
          <Button variant="sacro-ghost" onClick={() => window.location.href = "/habits/new"}>
            Agregar hábito
          </Button>
        </div>
      )}

      {/* Habits List */}
      {!loading && habits.length > 0 && (
        <div className="space-y-[12px]">
          {habits.map((habit) => {
            const targetSummary = getHabitTargetSummary(habit);
            const difficultyKey = habit.difficulty ?? "facil";
            const difficultyLabel = DIFFICULTY_LABELS[difficultyKey] ?? difficultyKey;
            const difficultyColor = DIFFICULTY_COLORS[difficultyKey] ?? "bg-white/10 text-white";

            return (
              <div
                key={habit.id}
                className="flex items-center gap-[14px] p-[16px] rounded-[24px] bg-white/13 border border-white/20 transition-colors hover:bg-white/20"
              >
                {/* Icon */}
                <div className="w-[58px] h-[58px] shrink-0 rounded-[18px] bg-white/18 grid place-items-center text-[34px] text-primary">
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
                    return <IconComp className="size-8 text-white" />;
                  })()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[18px] font-bold leading-tight truncate">{habit.name}</h3>
                  <p className="text-white/74 text-[13px] truncate mt-1">
                    {VALIDATION_TYPE_LABELS[habit.validation_type ?? "foto"]}
                    {targetSummary ? ` · ${targetSummary}` : ""}
                  </p>
                  
                  <div className="flex gap-[6px] mt-2">
                    <span className={`px-[8px] py-[2px] rounded-full text-[10px] font-bold ${difficultyColor}`}>
                      {difficultyLabel}
                    </span>
                    {habit.xp_base != null ? (
                      <span className="px-[8px] py-[2px] rounded-full text-[10px] font-bold bg-[#9d55ff]/30 text-[#9d55ff]">
                        {habit.xp_base} XP
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                {confirmingDeleteId === habit.id ? (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleDelete(habit.id)}
                      disabled={deleting}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-colors"
                    >
                      {deleting ? "..." : "Sí"}
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(null)}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-[8px] shrink-0">
                    {habit.validation_type && (
                      <Link
                        href={`/habits/validate?id=${habit.id}`}
                        className="w-[40px] h-[40px] rounded-full bg-[var(--purple)]/20 text-[var(--purple2)] grid place-items-center cursor-pointer transition-transform active:scale-95 hover:bg-[var(--purple)]/40"
                      >
                        <Camera className="size-4" />
                      </Link>
                    )}
                    <Link
                      href={`/habits/edit?id=${habit.id}`}
                      className="w-[40px] h-[40px] rounded-full bg-white/18 text-white grid place-items-center cursor-pointer transition-transform active:scale-95 hover:bg-white/25"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <button
                      onClick={() => setConfirmingDeleteId(habit.id)}
                      className="w-[40px] h-[40px] rounded-full bg-red-500/20 text-red-200 grid place-items-center cursor-pointer transition-transform active:scale-95 hover:bg-red-500/40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
