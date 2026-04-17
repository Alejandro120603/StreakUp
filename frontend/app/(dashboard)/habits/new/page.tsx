"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Clock3, FileText } from "lucide-react";
import Link from "next/link";
import { createHabit, fetchHabitCatalog } from "@/services/habits/habitService";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";
import { Input } from "@/components/ui/input";
import {
  getHabitTargetSummary,
  VALIDATION_TYPE_LABELS,
  type HabitCatalogItem,
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
  { value: "custom", label: "Personalizada" },
];

const WEEKDAYS = [
  { value: 0, label: "L" },
  { value: 1, label: "M" },
  { value: 2, label: "X" },
  { value: 3, label: "J" },
  { value: 4, label: "V" },
  { value: 5, label: "S" },
  { value: 6, label: "D" },
];

export default function NewHabitPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<HabitCatalogItem[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [customName, setCustomName] = useState("");
  const [description, setDescription] = useState("");
  const [validationType, setValidationType] = useState<ValidationType>("foto");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [targetDuration, setTargetDuration] = useState<string>("");
  const [targetQuantity, setTargetQuantity] = useState<string>("");
  const [targetUnit, setTargetUnit] = useState("");
  const [minTextLength, setMinTextLength] = useState<string>("");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const habits = await fetchHabitCatalog();
        setCatalog(habits);
        const firstHabit = habits[0] ?? null;
        setSelectedHabitId(firstHabit?.id ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar el catálogo.");
      } finally {
        setLoadingCatalog(false);
      }
    }

    void loadCatalog();
  }, []);

  const selectedHabit = useMemo(
    () => catalog.find((habit) => habit.id === selectedHabitId) ?? null,
    [catalog, selectedHabitId],
  );

  useEffect(() => {
    if (!selectedHabit) {
      return;
    }

    setCustomName("");
    setDescription("");
    setValidationType(selectedHabit.validation_type);
    setFrequency(selectedHabit.frequency);
    setTargetDuration(
      selectedHabit.target_duration !== null ? String(selectedHabit.target_duration) : "",
    );
    setTargetQuantity(
      selectedHabit.target_quantity !== null ? String(selectedHabit.target_quantity) : "",
    );
    setTargetUnit(selectedHabit.target_unit ?? "");
    setMinTextLength("");
    setScheduleDays([]);
  }, [selectedHabit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedHabitId) {
      setError("Selecciona un hábito del catálogo.");
      return;
    }

    if (frequency === "custom" && scheduleDays.length === 0) {
      setError("Debes seleccionar al menos un día para la frecuencia personalizada.");
      return;
    }

    setIsLoading(true);

    try {
      await createHabit({
        habito_id: selectedHabitId,
        custom_name: customName.trim() || null,
        description: description.trim() || null,
        validation_type: validationType,
        frequency,
        target_duration: validationType === "tiempo" && targetDuration.trim() ? Number(targetDuration) : null,
        target_quantity: validationType !== "tiempo" && targetQuantity.trim() ? Number(targetQuantity) : null,
        target_unit: validationType !== "tiempo" && targetUnit.trim() ? targetUnit.trim() : null,
        min_text_length: validationType === "texto" && minTextLength.trim() ? Number(minTextLength) : null,
        schedule_days: frequency === "custom" ? scheduleDays : undefined,
      });
      router.push("/habits");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar el hábito.");
    } finally {
      setIsLoading(false);
    }
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
          Agregar hábito
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      <ClayMotionBox className="p-6 mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Hábito del catálogo</Label>
            <select
              value={selectedHabitId ?? ""}
              onChange={(e) => setSelectedHabitId(Number(e.target.value))}
              required
              disabled={loadingCatalog || catalog.length === 0}
              className="w-full h-12 px-4 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none cursor-pointer"
            >
              {catalog.map((habit) => (
                <option key={habit.id} value={habit.id} className="bg-background text-foreground">
                  {habit.name}
                </option>
              ))}
            </select>
          </div>

          {loadingCatalog && (
            <div className="flex justify-center py-6">
              <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loadingCatalog && selectedHabit && (
            <>
              <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Base de catálogo</p>
                <p className="text-foreground font-semibold">{selectedHabit.name}</p>
                {selectedHabit.description ? (
                  <p className="text-sm text-muted-foreground">{selectedHabit.description}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 text-primary px-3 py-1">
                    {VALIDATION_TYPE_LABELS[selectedHabit.validation_type]}
                  </span>
                  {getHabitTargetSummary(selectedHabit) ? (
                    <span className="rounded-full bg-background text-foreground px-3 py-1">
                      {getHabitTargetSummary(selectedHabit)}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-green-500/10 text-green-600 px-3 py-1">
                    XP base: {selectedHabit.xp_base}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Nombre personalizado</Label>
                <Input
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder={selectedHabit.name}
                  className="h-12 bg-background border-border text-foreground rounded-xl focus-visible:ring-primary/50 focus-visible:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Descripción personalizada</Label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={selectedHabit.description ?? "Describe este hábito"}
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                />
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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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

              {frequency === "custom" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Días de la semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const isSelected = scheduleDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setScheduleDays((prev) => prev.filter((d) => d !== day.value));
                            } else {
                              setScheduleDays((prev) => [...prev, day.value].sort());
                            }
                          }}
                          className={`size-10 rounded-full text-sm font-semibold border transition-all duration-200 ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {validationType === "tiempo" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Duración objetivo</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      value={targetDuration}
                      onChange={(event) => setTargetDuration(event.target.value)}
                      placeholder="e.g. 15"
                      className="h-12 w-28 bg-background border-border text-foreground rounded-xl text-center focus-visible:ring-primary/50 focus-visible:border-primary"
                    />
                    <span className="text-muted-foreground text-sm">minutos</span>
                  </div>
                </div>
              )}

              {validationType !== "tiempo" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Meta de cantidad (Opcional)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      value={targetQuantity}
                      onChange={(event) => setTargetQuantity(event.target.value)}
                      placeholder="e.g. 3"
                      className="h-12 w-28 bg-background border-border text-foreground rounded-xl text-center focus-visible:ring-primary/50 focus-visible:border-primary"
                    />
                    <Input
                      value={targetUnit}
                      onChange={(event) => setTargetUnit(event.target.value)}
                      placeholder="vasos, pasos..."
                      className="h-12 flex-1 bg-background border-border text-foreground rounded-xl focus-visible:ring-primary/50 focus-visible:border-primary"
                    />
                  </div>
                </div>
              )}

              {validationType === "texto" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-sm font-semibold text-foreground">Longitud mínima de texto (Opcional)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      value={minTextLength}
                      onChange={(event) => setMinTextLength(event.target.value)}
                      placeholder="e.g. 50"
                      className="h-12 w-28 bg-background border-border text-foreground rounded-xl text-center focus-visible:ring-primary/50 focus-visible:border-primary"
                    />
                    <span className="text-muted-foreground text-sm">caracteres</span>
                  </div>
                </div>
              )}
            </>
          )}

          <Button
            type="submit"
            disabled={isLoading || loadingCatalog || !selectedHabitId}
            className="w-full h-12 rounded-xl text-primary-foreground font-semibold"
          >
            {isLoading ? "Guardando..." : "Agregar a mis hábitos"}
          </Button>
        </form>
      </ClayMotionBox>
    </div>
  );
}
