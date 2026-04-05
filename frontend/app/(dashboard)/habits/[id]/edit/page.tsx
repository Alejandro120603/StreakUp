"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Flame, Sprout, Moon } from "lucide-react";
import Link from "next/link";
import { fetchHabits, updateHabit } from "@/services/habits/habitService";
import { isOfflineModeActive } from "@/services/config/runtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";
import type { Habit } from "@/types/habits";

const PREDEFINED_HABITS = [
  "Beber agua",
  "Ejercicio",
  "Meditar",
  "Día sin quejas",
  "Trabajo profundo",
  "Completar tareas clave",
  "Levantarse en hora establecida",
  "Evitar distracciones",
  "Avanzar proyectos personales",
  "Leer",
  "Practar idioma",
  "Tender la cama",
] as const;

const HABIT_TYPES = [
  { value: "boolean", label: "Sí / No" },
  { value: "time", label: "Tiempo" },
  { value: "quantity", label: "Cantidad" },
] as const;

const FREQUENCIES = [
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Semanal" },
] as const;
const SECTIONS = [
  { value: "fire", label: "Fuego", Icon: Flame },
  { value: "plant", label: "Planta", Icon: Sprout },
  { value: "moon", label: "Luna", Icon: Moon },
] as const;



export default function EditHabitPage() {
  const router = useRouter();
  const params = useParams();
  const habitId = Number(params.id);
  const isOnline = !isOfflineModeActive();

  const [name, setName] = useState<string>(PREDEFINED_HABITS[0]);
  const [habitType, setHabitType] = useState<"boolean" | "time" | "quantity">("boolean");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [section, setSection] = useState<"fire" | "plant" | "moon">("fire");
  const [targetDuration, setTargetDuration] = useState(25);
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [targetUnit, setTargetUnit] = useState("vasos");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHabit, setLoadingHabit] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const habits = await fetchHabits();
        const habit = habits.find((h: Habit) => h.id === habitId);
        if (!habit) {
          setError("Hábito no encontrado.");
          return;
        }
        const loadedName = PREDEFINED_HABITS.includes(habit.name as typeof PREDEFINED_HABITS[number])
          ? habit.name
          : PREDEFINED_HABITS[0];
        setName(loadedName);
        setHabitType(habit.habit_type);
        setFrequency(habit.frequency);
        setSection(habit.section);
        if (habit.target_duration) setTargetDuration(habit.target_duration);
        setPomodoroEnabled(habit.pomodoro_enabled);
        if (habit.target_quantity) setTargetQuantity(habit.target_quantity);
        if (habit.target_unit) setTargetUnit(habit.target_unit);
      } catch {
        setError("Error al cargar hábito.");
      } finally {
        setLoadingHabit(false);
      }
    }
    load();
  }, [habitId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isOnline) return;
    setError("");
    setIsLoading(true);

    try {
      await updateHabit(habitId, {
        name: name.trim(),
        habit_type: habitType,
        frequency,
        section,
        target_duration: habitType === "time" ? targetDuration : null,
        pomodoro_enabled: habitType === "time" ? pomodoroEnabled : false,
        target_quantity: habitType === "quantity" ? targetQuantity : null,
        target_unit: habitType === "quantity" ? targetUnit : null,
      });
      router.push("/habits");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar hábito.");
    } finally {
      setIsLoading(false);
    }
  }

  if (loadingHabit) {
    return (
      <div className="flex justify-center py-20">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-6 pb-4 max-w-lg mx-auto px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/habits"
          className="flex items-center justify-center size-10 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground flex-1 text-center pr-10">
          Editar hábito
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      <ClayMotionBox className="p-6 mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Nombre del hábito</Label>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-12 px-4 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none cursor-pointer"
            >
              {PREDEFINED_HABITS.map((habit) => (
                <option key={habit} value={habit} className="bg-background text-foreground">
                  {habit}
                </option>
              ))}
            </select>
          </div>

          {/* Habit Type */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Tipo de hábito</Label>
            <div className="grid grid-cols-3 gap-2">
              {HABIT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setHabitType(t.value)}
                  className={`h-11 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    habitType === t.value
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-foreground bg-background hover:bg-secondary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time-specific fields */}
          {habitType === "time" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Duración objetivo</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(Number(e.target.value))}
                    className="h-12 w-24 bg-background border-border text-foreground rounded-xl text-center focus-visible:ring-primary/50 focus-visible:border-primary"
                  />
                  <span className="text-muted-foreground text-sm">minutos</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
                <div>
                  <p className="text-foreground text-sm font-medium">Modo Pomodoro</p>
                  <p className="text-muted-foreground text-xs">Pausas automáticas cada 25 minutos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPomodoroEnabled(!pomodoroEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    pomodoroEnabled ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform duration-200 ${
                      pomodoroEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Quantity-specific fields */}
          {habitType === "quantity" && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Meta de cantidad</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Number(e.target.value))}
                  className="h-12 w-24 bg-background border-border text-foreground rounded-xl text-center focus-visible:ring-primary/50 focus-visible:border-primary"
                />
                <Input
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="vasos"
                  className="h-12 flex-1 bg-background border-border text-foreground rounded-xl focus-visible:ring-primary/50 focus-visible:border-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">Ej: 8 vasos, 10000 pasos, 3 comidas</p>
            </div>
          )}

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Frecuencia</Label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFrequency(f.value)}
                  className={`h-11 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    frequency === f.value
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-foreground bg-background hover:bg-secondary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Método de progresión</Label>
            <div className="grid grid-cols-3 gap-2">
              {SECTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSection(s.value)}
                  className={`relative flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200 ${
                    section === s.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-secondary"
                  }`}
                >
                  <span className={`text-2xl ${section === s.value ? "text-primary" : "text-muted-foreground"}`}>
                    <s.Icon className="size-6" />
                  </span>
                  <span className={`text-xs font-medium ${section === s.value ? "text-primary" : "text-foreground"}`}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/* Submit */}
          {isOnline ? (
            <div className="w-full text-center space-y-2 mt-4">
              <p className="text-sm font-medium text-amber-400 bg-amber-400/10 py-3 rounded-xl border border-amber-400/20">
                La edición de hábitos en la nube se implementará próximamente. Sólo disponible en modo offline.
              </p>
              <Button
                type="button"
                disabled
                className="w-full h-12 rounded-xl text-base font-semibold bg-secondary text-muted-foreground cursor-not-allowed"
              >
                Guardar cambios
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_24px_rgba(93,95,239,0.4)] hover:shadow-[0_0_32px_rgba(93,95,239,0.55)] transition-all duration-300"
            >
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </Button>
          )}
        </form>
      </ClayMotionBox>
    </div>
  );
}
