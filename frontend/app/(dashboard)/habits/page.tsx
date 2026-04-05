"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, X, Camera, icons } from "lucide-react";
import { fetchHabits, deleteHabit } from "@/services/habits/habitService";
import type { Habit } from "@/types/habits";
import { SECTION_ICONS } from "@/types/habits";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";

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
    } catch {
      setError("Error al cargar hábitos.");
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
    } catch {
      setError("Error al eliminar hábito.");
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
            {habits.length} hábito{habits.length !== 1 ? "s" : ""} activo{habits.length !== 1 ? "s" : ""}
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
          <p className="text-sm">Presiona + para crear tu primer hábito</p>
        </div>
      )}

      {/* Habits List */}
      {!loading && habits.length > 0 && (
        <div className="space-y-3">
          {habits.map((habit) => (
            <ClayMotionBox
              key={habit.id}
              className="flex items-center gap-3 p-4 transition-colors hover:border-primary/50"
            >
              {/* Icon */}
              <div className="flex items-center justify-center size-11 rounded-2xl bg-secondary shrink-0 text-primary">
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

              {/* Name & Frequency */}
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm truncate">
                  {habit.name}
                </p>
                <p className="text-muted-foreground text-xs capitalize">
                  {habit.frequency === "daily" ? "Diario" : "Semanal"}
                </p>
              </div>

              {/* Actions */}
              {confirmingDeleteId === habit.id ? (
                // Inline confirmation
                <div className="flex items-center gap-2">
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
                // Normal actions
                <>
                  <Link
                    href={`/habits/validate?id=${habit.id}`}
                    className="flex items-center justify-center size-9 rounded-xl text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Validar hábito con IA"
                  >
                    <Camera className="size-4" />
                  </Link>
                  <Link
                    href={`/habits/${habit.id}/edit`}
                    className="flex items-center justify-center size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <button
                    onClick={() => setConfirmingDeleteId(habit.id)}
                    className="flex items-center justify-center size-9 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </ClayMotionBox>
          ))}
        </div>
      )}
    </div>
  );
}

