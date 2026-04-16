"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Clock3, FileText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchHabit, updateHabit } from "@/services/habits/habitService";
import {
  getHabitTargetSummary,
  VALIDATION_TYPE_LABELS,
  type Habit,
  type HabitFrequency,
  type ValidationType,
} from "@/types/habits";

const VALIDATION_TYPES: Array<{
  value: ValidationType;
  label: string;
  Icon: typeof Camera;
}> = [
  { value: "foto", label: "Foto", Icon: Camera },
  { value: "texto", label: "Texto", Icon: FileText },
  { value: "tiempo", label: "Tiempo", Icon: Clock3 },
];

const FREQUENCIES: Array<{ value: HabitFrequency; label: string }> = [
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Semanal" },
];

function EditHabitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const habitId = Number(searchParams.get("id"));

  const [habit, setHabit] = useState<Habit | null>(null);
  const [customName, setCustomName] = useState("");
  const [description, setDescription] = useState("");
  const [validationType, setValidationType] = useState<ValidationType>("foto");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [targetDuration, setTargetDuration] = useState<string>("");
  const [targetQuantity, setTargetQuantity] = useState<string>("");
  const [targetUnit, setTargetUnit] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHabit, setLoadingHabit] = useState(true);

  useEffect(() => {
    async function load() {
      if (!Number.isInteger(habitId) || habitId <= 0) {
        setError("Selecciona un hábito desde la lista.");
        setLoadingHabit(false);
        return;
      }

      try {
        const loadedHabit = await fetchHabit(habitId);
        setHabit(loadedHabit);
        setCustomName(loadedHabit.custom_name ?? "");
        setDescription(loadedHabit.custom_description ?? "");
        setValidationType(loadedHabit.validation_type ?? "foto");
        setFrequency(loadedHabit.frequency);
        setTargetDuration(
          loadedHabit.target_duration !== null ? String(loadedHabit.target_duration) : "",
        );
        setTargetQuantity(
          loadedHabit.target_quantity !== null ? String(loadedHabit.target_quantity) : "",
        );
        setTargetUnit(loadedHabit.target_unit ?? "");
        setError("");
      } catch (err) {
        setError(
          err instanceof Error && err.message.trim()
            ? err.message
            : "No se pudo cargar el hábito.",
        );
      } finally {
        setLoadingHabit(false);
      }
    }

    void load();
  }, [habitId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await updateHabit(habitId, {
        custom_name: customName.trim() || null,
        description: description.trim() || null,
        validation_type: validationType,
        frequency,
        target_duration: targetDuration.trim() ? Number(targetDuration) : null,
        target_quantity: targetQuantity.trim() ? Number(targetQuantity) : null,
        target_unit: targetUnit.trim() || null,
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

  if (!habit) {
    return (
      <div className="pt-6 pb-4 max-w-lg mx-auto px-4">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error || "Hábito no encontrado."}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-4 max-w-lg mx-auto px-4">
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

      <ClayMotionBox className="p-5 mb-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Base de catálogo</p>
        <p className="text-foreground font-semibold">{habit.name}</p>
        {habit.description ? (
          <p className="text-sm text-muted-foreground">{habit.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1">
            {VALIDATION_TYPE_LABELS[habit.validation_type ?? "foto"]}
          </span>
          {getHabitTargetSummary(habit) ? (
            <span className="rounded-full bg-secondary text-foreground px-3 py-1">
              🎯 {getHabitTargetSummary(habit)}
            </span>
          ) : null}
          {habit.difficulty ? (
            <span className="rounded-full bg-secondary text-muted-foreground px-3 py-1 capitalize">
              {habit.difficulty === "facil" ? "Fácil" : habit.difficulty === "media" ? "Media" : "Difícil"}
            </span>
          ) : null}
          {habit.xp_base != null ? (
            <span className="rounded-full bg-violet-500/10 text-violet-400 px-3 py-1">
              {habit.xp_base} XP
            </span>
          ) : null}
        </div>
      </ClayMotionBox>

      <ClayMotionBox className="p-6 mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Nombre personalizado</Label>
            <Input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder={habit.name}
              maxLength={120}
              className="h-12 bg-background border-border text-foreground rounded-xl focus-visible:ring-primary/50 focus-visible:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              Déjalo vacío para usar el nombre del catálogo: <span className="italic">{habit.name}</span>.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Descripción personalizada</Label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={habit.description ?? "Describe qué evidencia contará como completado (ej: foto con vaso de agua lleno)"}
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Esta descripción guía la validación con IA. Sé específico sobre qué evidencia se espera.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Tipo de validación</Label>
            <div className="grid grid-cols-3 gap-2">
              {VALIDATION_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValidationType(option.value)}
                  className={`flex flex-col items-center justify-center gap-1 h-16 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    validationType === option.value
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-foreground bg-background hover:bg-secondary"
                  }`}
                >
                  <option.Icon className="size-4" />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Frecuencia</Label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFrequency(option.value)}
                  className={`h-11 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    frequency === option.value
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-foreground bg-background hover:bg-secondary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Duración objetivo</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                value={targetDuration}
                onChange={(event) => setTargetDuration(event.target.value)}
                placeholder="0"
                className="h-12 w-28 bg-background border-border text-foreground rounded-xl text-center focus-visible:ring-primary/50 focus-visible:border-primary"
              />
              <span className="text-muted-foreground text-sm">minutos</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Meta de cantidad</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                value={targetQuantity}
                onChange={(event) => setTargetQuantity(event.target.value)}
                placeholder="0"
                className="h-12 w-28 bg-background border-border text-foreground rounded-xl text-center focus-visible:ring-primary/50 focus-visible:border-primary"
              />
              <Input
                value={targetUnit}
                onChange={(event) => setTargetUnit(event.target.value)}
                placeholder="vasos, pasos, páginas..."
                className="h-12 flex-1 bg-background border-border text-foreground rounded-xl focus-visible:ring-primary/50 focus-visible:border-primary"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </ClayMotionBox>
    </div>
  );
}

export default function EditHabitPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <EditHabitPageContent />
    </Suspense>
  );
}
