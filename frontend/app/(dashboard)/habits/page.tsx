"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { fetchHabits, deleteHabit } from "@/services/habits/habitService";
import type { Habit } from "@/types/habits";
import { SECTION_ICONS } from "@/types/habits";

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
    <div className="pt-8 pb-4 max-w-lg mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Hábitos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {habits.length} hábito{habits.length !== 1 ? "s" : ""} activo{habits.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/habits/new"
          className="flex items-center justify-center size-12 rounded-full bg-[#5D5FEF] hover:bg-[#4B4DDC] text-white shadow-[0_0_20px_rgba(93,95,239,0.4)] hover:shadow-[0_0_28px_rgba(93,95,239,0.55)] transition-all duration-300"
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
          <div className="size-8 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
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
            <div
              key={habit.id}
              className="flex items-center gap-3 rounded-xl border border-[#2A2A3E] bg-[#111127] px-4 py-3 transition-colors hover:border-[#3A3A5E]"
            >
              {/* Icon */}
              <div className="flex items-center justify-center size-11 rounded-xl bg-[#1A1A2E] text-2xl shrink-0">
                {SECTION_ICONS[habit.section] ?? habit.icon}
              </div>

              {/* Name & Frequency */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">
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
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                  >
                    {deleting ? "..." : "Eliminar"}
                  </button>
                  <button
                    onClick={() => setConfirmingDeleteId(null)}
                    className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-white hover:bg-[#1A1A2E] transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                // Normal actions
                <>
                  <Link
                    href={`/habits/${habit.id}/edit`}
                    className="flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-white hover:bg-[#1A1A2E] transition-colors"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <button
                    onClick={() => setConfirmingDeleteId(habit.id)}
                    className="flex items-center justify-center size-9 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

