"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Flame,
  ImageIcon,
  icons,
} from "lucide-react";
import { fetchHabits } from "@/services/habits/habitService";
import { validateHabit } from "@/services/validation/validationService";
import type { Habit, ValidationResult } from "@/types/habits";
import { SECTION_ICONS } from "@/types/habits";
import { ClayMotionBox } from "@/components/ui/clay-motion-box";

type PageStatus = "idle" | "loading" | "success" | "error";

function ValidateHabitPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const habitId = Number(searchParams.get("id"));

  const [habit, setHabit] = useState<Habit | null>(null);
  const [loadingHabit, setLoadingHabit] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [status, setStatus] = useState<PageStatus>("idle");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadHabit() {
      try {
        const habits = await fetchHabits();
        const found = habits.find((item) => item.id === habitId);
        setHabit(found ?? null);
        setLoadError("");
      } catch (err) {
        setHabit(null);
        setLoadError(
          err instanceof Error && err.message.trim()
            ? err.message
            : "No se pudo cargar el hábito para validarlo.",
        );
      } finally {
        setLoadingHabit(false);
      }
    }

    loadHabit();
  }, [habitId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Por favor selecciona un archivo de imagen.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("La imagen debe ser menor a 10MB.");
      return;
    }

    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  async function handleValidate() {
    if (!imageBase64 || !habit) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await validateHabit(habit.id, imageBase64);
      setResult(res);
      setStatus(res.valido ? "success" : "error");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al validar");
      setStatus("error");
    }
  }

  if (loadingHabit) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pt-8 pb-4 max-w-lg mx-auto px-4 text-center">
        <p className="text-muted-foreground mb-4">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary hover:text-primary/80 font-medium text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="pt-8 pb-4 max-w-lg mx-auto px-4 text-center">
        <p className="text-muted-foreground mb-4">Hábito no encontrado.</p>
        <button
          onClick={() => router.push("/habits")}
          className="text-primary hover:text-primary/80 font-medium text-sm"
        >
          ← Volver a hábitos
        </button>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-4 max-w-lg mx-auto px-4 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/habits")}
          className="flex items-center justify-center size-10 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Validar Hábito</h1>
          <p className="text-sm text-muted-foreground">
            Sube una foto como evidencia
          </p>
        </div>
      </div>

      <ClayMotionBox className="p-4 flex items-center gap-4">
        <div className="flex items-center justify-center size-14 rounded-xl bg-secondary text-primary text-3xl shrink-0">
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
            return <IconComp className="size-8" />;
          })()}
        </div>
        <div>
          <p className="text-foreground font-semibold text-lg">{habit.name}</p>
          <p className="text-muted-foreground text-sm capitalize">
            {habit.frequency === "daily" ? "Diario" : "Semanal"} ·{" "}
            {habit.habit_type === "boolean"
              ? "Completar"
              : habit.habit_type === "time"
              ? "Tiempo"
              : "Cantidad"}
          </p>
        </div>
      </ClayMotionBox>

      {status === "idle" && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {!imagePreview ? (
            <ClayMotionBox className="p-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-border bg-background/50 hover:border-primary/50 hover:bg-primary/5 p-12 flex flex-col items-center gap-3 transition-all duration-300 group"
              >
                <div className="size-16 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Upload className="size-7 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium text-sm">
                    Toca para subir una imagen
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    JPG, PNG o WebP · Máximo 10MB
                  </p>
                </div>
              </button>
            </ClayMotionBox>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview de evidencia"
                  className="w-full h-64 object-cover"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setImageBase64(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-3 right-3 size-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  ✕
                </button>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <ImageIcon className="size-4 inline mr-1" />
                Cambiar imagen
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleValidate}
            disabled={!imageBase64}
            className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(93,95,239,0.3)] hover:shadow-[0_0_28px_rgba(93,95,239,0.5)] active:scale-[0.98]"
          >
            <Sparkles className="size-4 inline mr-2" />
            Validar foto con IA
          </button>
        </div>
      )}

      {status === "loading" && (
        <ClayMotionBox className="p-8 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 size-16 rounded-full border-2 border-primary/20 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-semibold">Analizando imagen...</p>
            <p className="text-muted-foreground text-sm mt-1">
              La IA está verificando tu evidencia
            </p>
          </div>
        </ClayMotionBox>
      )}

      {status === "success" && result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="size-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-lg">¡Validación exitosa!</p>
                <p className="text-emerald-400 text-sm">{result.razon}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary p-4 text-center">
                <Sparkles className="size-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">+{result.xp_ganado ?? 0}</p>
                <p className="text-xs text-muted-foreground">XP ganado</p>
              </div>
              <div className="rounded-lg bg-secondary p-4 text-center">
                <Flame className="size-5 text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{result.nueva_racha ?? 0}</p>
                <p className="text-xs text-muted-foreground">Racha actual</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push("/habits")}
            className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
          >
            Volver a hábitos
          </button>
        </div>
      )}

      {status === "error" && result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="size-6 text-red-400" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-lg">Validación rechazada</p>
                <p className="text-red-400 text-sm">{result.razon}</p>
              </div>
            </div>

            <div className="rounded-lg bg-secondary p-4">
              <p className="text-xs text-muted-foreground mb-1">Confianza del modelo</p>
              <p className="text-foreground font-semibold">{Math.round(result.confianza * 100)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setStatus("idle");
                setResult(null);
              }}
              className="py-3 rounded-xl font-semibold text-foreground bg-secondary hover:bg-secondary/80 border border-border transition-colors"
            >
              Intentar otra vez
            </button>
            <button
              onClick={() => router.push("/habits")}
              className="py-3 rounded-xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {status === "error" && !result && errorMsg && (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-red-400 font-medium">{errorMsg}</p>
          </div>
          <button
            onClick={() => {
              setStatus("idle");
              setErrorMsg("");
            }}
            className="w-full py-3 rounded-xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

export default function ValidateHabitPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ValidateHabitPageContent />
    </Suspense>
  );
}
