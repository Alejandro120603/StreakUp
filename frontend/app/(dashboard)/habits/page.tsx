"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, X, Camera, icons } from "lucide-react";
import { fetchHabits, deleteHabit } from "@/services/habits/habitService";
import type { Habit } from "@/types/habits";
import { getHabitTargetSummary, SECTION_ICONS, VALIDATION_TYPE_LABELS } from "@/types/habits";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";

const DIFFICULTY_LABELS: Record<string, string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  facil: "bg-emerald-500/10 text-emerald-500",
  media: "bg-amber-500/10 text-amber-500",
  dificil: "bg-red-500/10 text-red-400",
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
    <div className="pt-8 pb-4 max-w-lg mx-auto px-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hábitos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {habits.length} hábito{habits.length !== 1 ? "s" : ""} activo
            {habits.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/habits/new"
          className="flex items-center justify-center size-12 rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(93,95,239,0.4)] transition-all duration-300"
        >
          <Plus className="size-6" />
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && habits.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No tienes hábitos aún</p>
          <p className="text-sm">Presiona + para agregar un hábito del catálogo</p>
        </div>
      )}

      {/* Habits List */}
      {!loading && habits.length > 0 && (
        <div className="space-y-3">
          {habits.map((habit) => {
            const targetSummary = getHabitTargetSummary(habit);
            const difficultyKey = habit.difficulty ?? "facil";
            const difficultyLabel = DIFFICULTY_LABELS[difficultyKey] ?? difficultyKey;
            const difficultyColor =
              DIFFICULTY_COLORS[difficultyKey] ?? "bg-secondary text-foreground";

            return (
              <ClayMotionBox
                key={habit.id}
                className="flex items-start gap-3 p-4 transition-colors hover:border-primary/50"
              >
                {/* Icon */}
                <div className="flex items-center justify-center size-11 rounded-2xl bg-secondary shrink-0 text-primary mt-0.5">
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
                    return <IconComp className="size-6" />;
                  })()}
                </div>

                {/* Name, Badges & Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold text-sm truncate">{habit.name}</p>

                  {/* Metadata badges */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {/* Validation type — how this habit is verified */}
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                      {VALIDATION_TYPE_LABELS[habit.validation_type ?? "foto"]}
                    </span>

                    {/* Frequency */}
                    <span className="inline-flex items-center rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[11px]">
                      {habit.frequency === "daily" ? "Diario" : "Semanal"}
                    </span>

                    {/* Target — what the user needs to achieve */}
                    {targetSummary ? (
                      <span className="inline-flex items-center rounded-full bg-secondary text-foreground px-2 py-0.5 text-[11px] font-medium">
                        🎯 {targetSummary}
                      </span>
                    ) : null}

                    {/* Difficulty */}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${difficultyColor}`}
                    >
                      {difficultyLabel}
                    </span>

                    {/* XP reward */}
                    {habit.xp_base != null ? (
                      <span className="inline-flex items-center rounded-full bg-violet-500/10 text-violet-400 px-2 py-0.5 text-[11px] font-medium">
                        {habit.xp_base} XP
                      </span>
                    ) : null}
                  </div>

                  {/* Optional description */}
                  {habit.description ? (
                    <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2">
                      {habit.description}
                    </p>
                  ) : null}
                </div>

                {/* Actions */}
                {confirmingDeleteId === habit.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDelete(habit.id)}
                      disabled={deleting}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                    >
                      {deleting ? "..." : "Eliminar"}
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(null)}
                      className="flex items-center justify-center size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/habits/validate?id=${habit.id}`}
                      className="flex items-center justify-center size-9 rounded-xl text-primary hover:bg-primary/10 transition-colors"
                      title={`Abrir validación ${VALIDATION_TYPE_LABELS[habit.validation_type ?? "foto"].toLowerCase()}`}
                    >
                      <Camera className="size-4" />
                    </Link>
                    <Link
                      href={`/habits/edit?id=${habit.id}`}
                      className="flex items-center justify-center size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Editar configuración"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <button
                      onClick={() => setConfirmingDeleteId(habit.id)}
                      className="flex items-center justify-center size-9 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </ClayMotionBox>
            );
          })}
        </div>
      )}
    </div>
  );
}
