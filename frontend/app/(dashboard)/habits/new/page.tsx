"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createHabit, fetchHabitCatalog } from "@/services/habits/habitService";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { HabitCatalogItem } from "@/types/habits";

export default function NewHabitPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<HabitCatalogItem[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const habits = await fetchHabitCatalog();
        setCatalog(habits);
        setSelectedHabitId(habits[0]?.id ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar catálogo.");
      } finally {
        setLoadingCatalog(false);
      }
    }

    loadCatalog();
  }, []);

  const selectedHabit = catalog.find((habit) => habit.id === selectedHabitId) ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedHabitId) {
      setError("Selecciona un hábito del catálogo.");
      return;
    }

    setIsLoading(true);

    try {
      await createHabit({ habito_id: selectedHabitId });
      router.push("/habits");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear hábito.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="pt-6 pb-4 max-w-lg mx-auto px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/habits"
          className="flex items-center justify-center size-10 rounded-lg text-white hover:bg-[#1A1A2E] transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold text-white flex-1 text-center pr-10">
          Nuevo hábito
        </h1>
      </div>

      <div className="border-t border-[#2A2A3E] mb-6" />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-white">Hábito del catálogo</Label>
          <select
            value={selectedHabitId ?? ""}
            onChange={(e) => setSelectedHabitId(Number(e.target.value))}
            required
            disabled={loadingCatalog || catalog.length === 0}
            className="w-full h-12 px-4 bg-[#1A1A2E] border border-[#2A2A3E] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/50 focus:border-[#5D5FEF] transition-colors appearance-none cursor-pointer"
          >
            {catalog.map((habit) => (
              <option key={habit.id} value={habit.id} className="bg-[#1A1A2E] text-white">
                {habit.name}
              </option>
            ))}
          </select>
        </div>

        {loadingCatalog && (
          <div className="flex justify-center py-6">
            <div className="size-8 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingCatalog && selectedHabit && (
          <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-4 space-y-2">
            <p className="text-white font-semibold">{selectedHabit.name}</p>
            {selectedHabit.description && (
              <p className="text-sm text-muted-foreground">{selectedHabit.description}</p>
            )}
            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-[#1A1A2E] px-3 py-1 text-white/80">
                Dificultad: {selectedHabit.difficulty}
              </span>
              <span className="rounded-full bg-[#1A1A2E] px-3 py-1 text-white/80">
                XP base: {selectedHabit.xp_base}
              </span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || loadingCatalog || !selectedHabitId}
          className="w-full h-12 rounded-xl bg-[#5D5FEF] hover:bg-[#4B4DDC] text-white font-semibold shadow-[0_0_16px_rgba(93,95,239,0.3)]"
        >
          {isLoading ? "Creando..." : "Agregar hábito"}
        </Button>
      </form>
    </div>
  );
}
