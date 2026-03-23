"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const THEMES = {
  fire: { label: "Fuego", bg: "from-orange-950 to-[#0A0A0A]", accent: "#F97316" },
  candle: { label: "Vela", bg: "from-purple-950 to-[#0A0A0A]", accent: "#A855F7" },
  ice: { label: "Hielo", bg: "from-blue-950 to-[#0A0A0A]", accent: "#3B82F6" },
  hourglass: { label: "Reloj", bg: "from-amber-950 to-[#0A0A0A]", accent: "#D97706" },
};

type ThemeKey = keyof typeof THEMES;
type TimerState = "idle" | "focus" | "break" | "finished";

/* ─── Animated Theme Components ─── */

function CandleAnimation({ progress }: { progress: number }) {
  const height = 60 + progress * 40; // candle height 60-100
  const flameScale = 0.3 + progress * 0.7;
  const flameOpacity = 0.4 + progress * 0.6;

  return (
    <svg viewBox="0 0 100 160" className="w-24 h-32 mx-auto">
      {/* Candle body */}
      <rect x="30" y={160 - height} width="40" height={height} rx="4" fill="#8B5CF6" opacity="0.8" />
      {/* Wick */}
      <line x1="50" y1={160 - height - 5} x2="50" y2={160 - height} stroke="#555" strokeWidth="2" />
      {/* Flame */}
      <g transform={`translate(50, ${155 - height}) scale(${flameScale})`} opacity={flameOpacity}>
        <ellipse cx="0" cy="-15" rx="6" ry="12" fill="#FCD34D">
          <animate attributeName="rx" values="5;7;5" dur="0.5s" repeatCount="indefinite" />
          <animate attributeName="ry" values="10;14;10" dur="0.7s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="0" cy="-12" rx="3" ry="7" fill="#FBBF24">
          <animate attributeName="ry" values="6;8;6" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
      </g>
      {/* Wax drips */}
      {progress > 0.3 && (
        <circle cx="32" cy={160 - height + 10} r="3" fill="#7C3AED" opacity="0.5" />
      )}
    </svg>
  );
}

function FireAnimation({ progress }: { progress: number }) {
  const scale = 0.3 + progress * 0.7;
  const opacity = 0.3 + progress * 0.7;

  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28 mx-auto" opacity={opacity}>
      <g transform={`translate(60, 110) scale(${scale})`}>
        {/* Outer flame */}
        <path d="M0,-80 C-20,-60 -30,-30 -25,0 C-25,15 -15,20 0,20 C15,20 25,15 25,0 C30,-30 20,-60 0,-80Z" fill="#F97316">
          <animate attributeName="d"
            values="M0,-80 C-20,-60 -30,-30 -25,0 C-25,15 -15,20 0,20 C15,20 25,15 25,0 C30,-30 20,-60 0,-80Z;
                    M0,-85 C-25,-60 -28,-35 -22,0 C-22,15 -12,22 0,22 C12,22 22,15 22,0 C28,-35 25,-60 0,-85Z;
                    M0,-80 C-20,-60 -30,-30 -25,0 C-25,15 -15,20 0,20 C15,20 25,15 25,0 C30,-30 20,-60 0,-80Z"
            dur="0.8s" repeatCount="indefinite" />
        </path>
        {/* Inner flame */}
        <path d="M0,-50 C-10,-35 -15,-15 -12,0 C-12,10 -6,14 0,14 C6,14 12,10 12,0 C15,-15 10,-35 0,-50Z" fill="#FBBF24">
          <animate attributeName="d"
            values="M0,-50 C-10,-35 -15,-15 -12,0 C-12,10 -6,14 0,14 C6,14 12,10 12,0 C15,-15 10,-35 0,-50Z;
                    M0,-55 C-12,-35 -13,-18 -10,0 C-10,10 -5,16 0,16 C5,16 10,10 10,0 C13,-18 12,-35 0,-55Z;
                    M0,-50 C-10,-35 -15,-15 -12,0 C-12,10 -6,14 0,14 C6,14 12,10 12,0 C15,-15 10,-35 0,-50Z"
            dur="0.6s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  );
}

function IceAnimation({ progress }: { progress: number }) {
  const meltOffset = (1 - progress) * 30;
  const puddleWidth = (1 - progress) * 30;

  return (
    <svg viewBox="0 0 100 120" className="w-24 h-28 mx-auto">
      {/* Ice cube */}
      <g transform={`translate(0, ${meltOffset})`}>
        <rect x="20" y="20" width="60" height={60 * progress + 10} rx="6" fill="#60A5FA" opacity={0.4 + progress * 0.5}>
          <animate attributeName="opacity" values={`${0.4 + progress * 0.5};${0.3 + progress * 0.5};${0.4 + progress * 0.5}`} dur="2s" repeatCount="indefinite" />
        </rect>
        {/* Shine */}
        <rect x="30" y="30" width="8" height={20 * progress} rx="3" fill="white" opacity="0.3" />
        <rect x="42" y="25" width="5" height={15 * progress} rx="2" fill="white" opacity="0.2" />
      </g>
      {/* Puddle */}
      <ellipse cx="50" cy={95 + meltOffset / 2} rx={10 + puddleWidth} ry="6" fill="#3B82F6" opacity="0.3" />
      {/* Drip */}
      {progress > 0.2 && progress < 0.9 && (
        <circle cx="55" cy={80 + meltOffset} r="3" fill="#60A5FA" opacity="0.5">
          <animate attributeName="cy" values={`${70 + meltOffset};${90 + meltOffset};${70 + meltOffset}`} dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

function HourglassAnimation({ progress }: { progress: number }) {
  const topSand = progress * 35;
  const bottomSand = (1 - progress) * 35;

  return (
    <svg viewBox="0 0 80 120" className="w-20 h-28 mx-auto">
      {/* Frame */}
      <rect x="15" y="5" width="50" height="6" rx="2" fill="#D97706" opacity="0.8" />
      <rect x="15" y="109" width="50" height="6" rx="2" fill="#D97706" opacity="0.8" />
      {/* Glass outline */}
      <path d="M20,11 L20,45 L40,60 L60,45 L60,11" fill="none" stroke="#D97706" strokeWidth="2" opacity="0.5" />
      <path d="M20,109 L20,75 L40,60 L60,75 L60,109" fill="none" stroke="#D97706" strokeWidth="2" opacity="0.5" />
      {/* Top sand */}
      <path d={`M22,${13 + (35 - topSand)} L40,${48 - topSand * 0.2} L58,${13 + (35 - topSand)} Z`} fill="#FBBF24" opacity="0.7" />
      {/* Bottom sand */}
      <path d={`M22,${107 - bottomSand} L40,${107 - bottomSand * 0.8} L58,${107 - bottomSand} L58,107 L22,107 Z`} fill="#FBBF24" opacity="0.7" />
      {/* Falling sand stream */}
      {progress > 0.05 && progress < 0.95 && (
        <line x1="40" y1="55" x2="40" y2={75 + bottomSand * 0.3} stroke="#FBBF24" strokeWidth="2" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.3;0.6" dur="0.5s" repeatCount="indefinite" />
        </line>
      )}
    </svg>
  );
}

const THEME_ANIMATIONS: Record<ThemeKey, React.FC<{ progress: number }>> = {
  fire: FireAnimation,
  candle: CandleAnimation,
  ice: IceAnimation,
  hourglass: HourglassAnimation,
};

function PomodoroContent() {
  const searchParams = useSearchParams();
  const themeKey = (searchParams.get("theme") as ThemeKey) || "fire";
  const theme = THEMES[themeKey] || THEMES.fire;
  const ThemeAnim = THEME_ANIMATIONS[themeKey] || THEME_ANIMATIONS.fire;

  const [studyMinutes, setStudyMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [cycles, setCycles] = useState(4);

  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerState !== "idle" && timerState !== "finished" && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearTimer();
            // Transition to next phase
            if (timerState === "focus") {
              if (currentCycle >= cycles) {
                setTimerState("finished");
                return 0;
              }
              setTimerState("break");
              const breakSecs = breakMinutes * 60;
              setTotalSeconds(breakSecs);
              return breakSecs;
            } else if (timerState === "break") {
              setCurrentCycle((c) => c + 1);
              setTimerState("focus");
              const focusSecs = studyMinutes * 60;
              setTotalSeconds(focusSecs);
              return focusSecs;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearTimer();
  }, [timerState, isPaused, currentCycle, cycles, breakMinutes, studyMinutes, clearTimer]);

  function startTimer() {
    const secs = studyMinutes * 60;
    setSecondsLeft(secs);
    setTotalSeconds(secs);
    setCurrentCycle(1);
    setTimerState("focus");
    setIsPaused(false);
  }

  function togglePause() {
    setIsPaused((p) => !p);
  }

  function stopTimer() {
    clearTimer();
    setTimerState("idle");
    setSecondsLeft(studyMinutes * 60);
    setTotalSeconds(studyMinutes * 60);
    setIsPaused(false);
    setCurrentCycle(1);
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 1;

  // SVG circle calculations
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.bg} flex flex-col`}>
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="size-5" />
          <span className="text-sm">Inicio</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-8 max-w-lg mx-auto w-full">
        {/* Theme Animation */}
        <div className="py-4">
          <ThemeAnim progress={progress} />
        </div>

        {/* Circular Timer */}
        <div className="relative w-52 h-52 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#2A2A3E" strokeWidth="4" />
            {/* Progress circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={theme.accent}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              {timerState === "focus" ? "Enfocado" : timerState === "break" ? "Descanso" : timerState === "finished" ? "¡Completado!" : "Listo"}
            </span>
            {timerState !== "idle" && timerState !== "finished" && (
              <span className="text-xs text-muted-foreground mt-0.5">
                Ciclo {currentCycle}/{cycles}
              </span>
            )}
          </div>
        </div>

        {/* Configuration */}
        <div className="w-full rounded-xl border border-[#2A2A3E] bg-[#111127]/80 p-5 space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-white text-center">Configuración de sesión</h3>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tiempo de estudio (minutos)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={studyMinutes}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 25;
                setStudyMinutes(v);
                if (timerState === "idle") {
                  setSecondsLeft(v * 60);
                  setTotalSeconds(v * 60);
                }
              }}
              disabled={timerState !== "idle"}
              className="h-11 bg-[#1A1A2E] border-[#2A2A3E] text-white text-center text-lg font-bold rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tiempo de descanso (minutos)</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 5)}
              disabled={timerState !== "idle"}
              className="h-11 bg-[#1A1A2E] border-[#2A2A3E] text-white text-center text-lg font-bold rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Número de ciclos</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={cycles}
              onChange={(e) => setCycles(parseInt(e.target.value) || 4)}
              disabled={timerState !== "idle"}
              className="h-11 bg-[#1A1A2E] border-[#2A2A3E] text-white text-center text-lg font-bold rounded-xl"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="w-full space-y-3">
          {timerState === "idle" ? (
            <Button
              onClick={startTimer}
              className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-[0_0_24px_rgba(236,72,153,0.4)] transition-all"
            >
              <Play className="size-5 mr-2" />
              Comenzar
            </Button>
          ) : timerState === "finished" ? (
            <Button
              onClick={stopTimer}
              className="w-full h-12 rounded-xl text-base font-semibold bg-[#5D5FEF] hover:bg-[#4B4DDC] text-white"
            >
              ¡Sesión completada! Reiniciar
            </Button>
          ) : (
            <>
              <Button
                onClick={togglePause}
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-[0_0_24px_rgba(236,72,153,0.4)] transition-all"
              >
                {isPaused ? (
                  <><Play className="size-5 mr-2" /> Reanudar</>
                ) : (
                  <><Pause className="size-5 mr-2" /> Pausar</>
                )}
              </Button>
              <Button
                onClick={stopTimer}
                variant="outline"
                className="w-full h-12 rounded-xl text-base font-semibold border-[#2A2A3E] bg-transparent text-white hover:bg-[#1A1A2E]"
              >
                <Square className="size-4 mr-2" />
                Finalizar sesión
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PomodoroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="size-8 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PomodoroContent />
    </Suspense>
  );
}

