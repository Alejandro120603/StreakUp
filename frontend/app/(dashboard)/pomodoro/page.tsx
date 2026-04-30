"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completePomodoroSession,
  createPomodoroSession,
  fetchPomodoroSessions,
} from "@/services/pomodoro/pomodoroService";
import type { PomodoroSession } from "@/types/pomodoro";

const THEMES = {
  fire: { label: "Fuego", bg: "from-orange-950 to-[#0A0A0A]", accent: "#F97316" },
  candle: { label: "Vela", bg: "from-purple-950 to-[#0A0A0A]", accent: "#A855F7" },
  ice: { label: "Hielo", bg: "from-blue-950 to-[#0A0A0A]", accent: "#3B82F6" },
  hourglass: { label: "Reloj", bg: "from-amber-950 to-[#0A0A0A]", accent: "#D97706" },
};

type ThemeKey = keyof typeof THEMES;
type TimerState = "idle" | "focus" | "break" | "finished";

/* ─── Animated Theme Components ─── */

interface AnimProps { progress: number; isPaused?: boolean; isActive?: boolean; }

function FireAnimation({ progress, isPaused, isActive }: AnimProps) {
  const scale = 0.35 + progress * 0.65;
  const opacity = 0.35 + progress * 0.65;
  const dur = isPaused ? "9999s" : "0.8s";
  const durFast = isPaused ? "9999s" : "0.6s";
  const glowR = Math.round(20 + progress * 40);

  return (
    <svg viewBox="0 0 140 150" className="w-32 h-36 mx-auto" style={{ filter: isActive && !isPaused ? `drop-shadow(0 0 ${glowR}px rgba(249,115,22,0.7))` : undefined }}>
      {/* Ember particles */}
      {isActive && !isPaused && [
        { cx: 50, delay: "0s", dur2: "1.2s" },
        { cx: 70, delay: "0.4s", dur2: "1.5s" },
        { cx: 90, delay: "0.8s", dur2: "1.0s" },
      ].map((e, i) => (
        <circle key={i} cx={e.cx} r="2.5" fill="#FBBF24" opacity="0.8">
          <animate attributeName="cy" values="120;40;10" dur={e.dur2} begin={e.delay} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.5;0" dur={e.dur2} begin={e.delay} repeatCount="indefinite" />
          <animate attributeName="r" values="2.5;1.5;0" dur={e.dur2} begin={e.delay} repeatCount="indefinite" />
        </circle>
      ))}
      <g transform={`translate(70, 130) scale(${scale})`} opacity={opacity}>
        {/* Outer flame */}
        <path d="M0,-80 C-20,-60 -30,-30 -25,0 C-25,15 -15,20 0,20 C15,20 25,15 25,0 C30,-30 20,-60 0,-80Z" fill="#F97316">
          <animate attributeName="d"
            values="M0,-80 C-20,-60 -30,-30 -25,0 C-25,15 -15,20 0,20 C15,20 25,15 25,0 C30,-30 20,-60 0,-80Z;M0,-88 C-25,-62 -28,-35 -22,0 C-22,15 -12,22 0,22 C12,22 22,15 22,0 C28,-35 25,-62 0,-88Z;M0,-80 C-20,-60 -30,-30 -25,0 C-25,15 -15,20 0,20 C15,20 25,15 25,0 C30,-30 20,-60 0,-80Z"
            dur={dur} repeatCount="indefinite" />
        </path>
        {/* Middle flame */}
        <path d="M0,-55 C-12,-38 -16,-18 -13,0 C-13,10 -6,15 0,15 C6,15 13,10 13,0 C16,-18 12,-38 0,-55Z" fill="#FB923C">
          <animate attributeName="d"
            values="M0,-55 C-12,-38 -16,-18 -13,0 C-13,10 -6,15 0,15 C6,15 13,10 13,0 C16,-18 12,-38 0,-55Z;M0,-60 C-14,-36 -14,-20 -11,0 C-11,11 -5,17 0,17 C5,17 11,11 11,0 C14,-20 14,-36 0,-60Z;M0,-55 C-12,-38 -16,-18 -13,0 C-13,10 -6,15 0,15 C6,15 13,10 13,0 C16,-18 12,-38 0,-55Z"
            dur={durFast} repeatCount="indefinite" />
        </path>
        {/* Inner hot core */}
        <path d="M0,-30 C-6,-20 -8,-8 -6,0 C-6,6 -3,9 0,9 C3,9 6,6 6,0 C8,-8 6,-20 0,-30Z" fill="#FEF08A" />
      </g>
    </svg>
  );
}

function CandleAnimation({ progress, isPaused, isActive }: AnimProps) {
  const height = 55 + progress * 45;
  const flameScale = 0.4 + progress * 0.6;
  const dur = isPaused ? "9999s" : "0.55s";
  const durSlow = isPaused ? "9999s" : "1.8s";

  return (
    <svg viewBox="0 0 120 180" className="w-28 h-40 mx-auto"
      style={{ filter: isActive && !isPaused ? "drop-shadow(0 0 18px rgba(168,85,247,0.6))" : undefined }}>
      {/* Ambient glow behind flame */}
      {isActive && <ellipse cx="60" cy={170 - height - 10} rx="18" ry="8" fill="#A855F7" opacity="0.15"><animate attributeName="opacity" values="0.1;0.25;0.1" dur={durSlow} repeatCount="indefinite" /></ellipse>}
      {/* Candle body with gradient */}
      <defs>
        <linearGradient id="candleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6D28D9" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
      <rect x="35" y={170 - height} width="50" height={height} rx="5" fill="url(#candleGrad)" />
      {/* Highlight */}
      <rect x="42" y={172 - height} width="8" height={height * 0.6} rx="4" fill="white" opacity="0.12" />
      {/* Wax drips */}
      {progress > 0.25 && <path d={`M35,${175 - height} Q32,${183 - height} 35,${191 - height}`} stroke="#7C3AED" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.5" />}
      {progress > 0.5  && <path d={`M82,${178 - height} Q85,${186 - height} 82,${196 - height}`} stroke="#6D28D9" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.4" />}
      {/* Wick */}
      <line x1="60" y1={162 - height} x2="60" y2={168 - height} stroke="#374151" strokeWidth="2.5" />
      {/* Flame */}
      <g transform={`translate(60,${158 - height}) scale(${flameScale})`}>
        <ellipse cx="0" cy="-16" rx="7" ry="14" fill="#FDE68A">
          <animate attributeName="rx" values="6;8;5;7;6" dur={dur} repeatCount="indefinite" />
          <animate attributeName="ry" values="12;16;11;15;12" dur={dur} repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="0" cy="-13" rx="4" ry="9" fill="#F59E0B">
          <animate attributeName="ry" values="8;10;7;9;8" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="0" cy="-10" rx="2" ry="5" fill="white" opacity="0.6" />
      </g>
    </svg>
  );
}

function IceAnimation({ progress, isPaused }: AnimProps) {
  const meltY = (1 - progress) * 28;
  const puddleRx = 8 + (1 - progress) * 32;
  const cubeH = 30 + progress * 35;
  const dripDur = isPaused ? "9999s" : "1.4s";

  return (
    <svg viewBox="0 0 110 140" className="w-28 h-36 mx-auto">
      <defs>
        <linearGradient id="iceGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.5" />
        </linearGradient>
        <filter id="iceBlur"><feGaussianBlur stdDeviation="1" /></filter>
      </defs>
      <g transform={`translate(0,${meltY})`}>
        {/* Main ice block */}
        <rect x="22" y="20" width="66" height={cubeH} rx="7" fill="url(#iceGrad)" />
        {/* Refraction facets */}
        <polygon points="22,20 55,20 40,38" fill="white" opacity="0.18" />
        <polygon points="88,20 55,20 70,35" fill="white" opacity="0.12" />
        {/* Vertical shine */}
        <rect x="32" y="24" width="7" height={cubeH * 0.55} rx="3" fill="white" opacity="0.28" />
        <rect x="44" y="22" width="4" height={cubeH * 0.35} rx="2" fill="white" opacity="0.18" />
        {/* Crack lines */}
        {progress < 0.7 && <line x1="60" y1="28" x2="72" y2={28 + cubeH * 0.4} stroke="white" strokeWidth="1" opacity="0.15" />}
      </g>
      {/* Drip 1 */}
      {progress > 0.15 && progress < 0.92 && (
        <ellipse cx="58" rx="3" ry="4" fill="#60A5FA" opacity="0.7">
          <animate attributeName="cy" values={`${40 + meltY};${105};${40 + meltY}`} dur={dripDur} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.3;0" dur={dripDur} repeatCount="indefinite" />
        </ellipse>
      )}
      {/* Drip 2 */}
      {progress > 0.3 && progress < 0.88 && (
        <ellipse cx="42" rx="2" ry="3" fill="#93C5FD" opacity="0.6">
          <animate attributeName="cy" values={`${38 + meltY};${108};${38 + meltY}`} dur="1.9s" begin="0.7s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0.2;0" dur="1.9s" begin="0.7s" repeatCount="indefinite" />
        </ellipse>
      )}
      {/* Puddle */}
      <ellipse cx="55" cy="118" rx={puddleRx} ry="6" fill="#3B82F6" opacity={0.15 + (1 - progress) * 0.25} />
    </svg>
  );
}

function HourglassAnimation({ progress, isPaused, isActive }: AnimProps) {
  const topSand = progress * 34;
  const bottomSand = (1 - progress) * 34;
  // Rotate 180° when session is running and NOT paused
  const rotation = isActive && !isPaused ? "animate-spin-slow" : "";
  const streamDur = isPaused ? "9999s" : "0.5s";

  return (
    <svg viewBox="0 0 90 130" className={`w-24 h-32 mx-auto transition-transform duration-700 ${rotation}`}
      style={isActive && !isPaused ? { animation: "hourglass-sway 4s ease-in-out infinite" } : undefined}>
      {/* Frame bars */}
      <rect x="12" y="3" width="66" height="8" rx="3" fill="#D97706" />
      <rect x="12" y="119" width="66" height="8" rx="3" fill="#D97706" />
      {/* Vertical frame rods */}
      <line x1="16" y1="11" x2="16" y2="119" stroke="#B45309" strokeWidth="3" />
      <line x1="74" y1="11" x2="74" y2="119" stroke="#B45309" strokeWidth="3" />
      {/* Glass outline top */}
      <path d="M20,11 L20,48 L45,63 L70,48 L70,11 Z" fill="#FEF3C7" opacity="0.06" stroke="#D97706" strokeWidth="1.5" opacity2="0.5" />
      {/* Glass outline bottom */}
      <path d="M20,119 L20,82 L45,67 L70,82 L70,119 Z" fill="#FEF3C7" opacity="0.06" stroke="#D97706" strokeWidth="1.5" />
      {/* Top sand mass */}
      <path d={`M22,${14 + (34 - topSand)} L45,${50 - topSand * 0.22} L68,${14 + (34 - topSand)} Z`} fill="#FBBF24" opacity="0.75" />
      {/* Bottom sand mass */}
      <path d={`M22,${117 - bottomSand} L45,${117 - bottomSand * 0.75} L68,${117 - bottomSand} L68,117 L22,117 Z`} fill="#FCD34D" opacity="0.75" />
      {/* Sand stream */}
      {progress > 0.04 && progress < 0.96 && (
        <line x1="45" y1="59" x2="45" y2={77 + bottomSand * 0.35} stroke="#FBBF24" strokeWidth="2.5" opacity="0.65">
          <animate attributeName="opacity" values="0.65;0.25;0.65" dur={streamDur} repeatCount="indefinite" />
          <animate attributeName="strokeWidth" values="2.5;1.5;2.5" dur={streamDur} repeatCount="indefinite" />
        </line>
      )}
      {/* Center pinch glow */}
      <ellipse cx="45" cy="63" rx="4" ry="2" fill="#FDE68A" opacity="0.4" />
      <style>{`
        @keyframes hourglass-sway {
          0%,100% { transform: rotate(-2deg); }
          50%       { transform: rotate(2deg); }
        }
      `}</style>
    </svg>
  );
}

const THEME_ANIMATIONS: Record<ThemeKey, React.FC<AnimProps>> = {
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
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [recentSessions, setRecentSessions] = useState<PomodoroSession[]>([]);
  const [sessionError, setSessionError] = useState("");
  const [recentSessionsError, setRecentSessionsError] = useState("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const completingSessionRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const loadRecentSessions = useCallback(async () => {
    try {
      setRecentSessions(await fetchPomodoroSessions(5));
      setRecentSessionsError("");
    } catch (error) {
      setRecentSessionsError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "No se pudieron cargar las sesiones recientes reales.",
      );
    }
  }, []);

  useEffect(() => {
    loadRecentSessions();
  }, [loadRecentSessions]);

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

  async function startTimer() {
    setSessionError("");

    try {
      const session = await createPomodoroSession({
        theme: themeKey,
        study_minutes: studyMinutes,
        break_minutes: breakMinutes,
        cycles,
      });
      setActiveSessionId(session.id);
      setRecentSessions((prev) => [session, ...prev.filter((existing) => existing.id !== session.id)].slice(0, 5));
      
      const secs = studyMinutes * 60;
      setSecondsLeft(secs);
      setTotalSeconds(secs);
      setCurrentCycle(1);
      setTimerState("focus");
      setIsPaused(false);
      completingSessionRef.current = false;
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "No se pudo iniciar la sesión.");
    }
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
    setActiveSessionId(null);
    completingSessionRef.current = false;
  }

  useEffect(() => {
    if (timerState !== "finished" || activeSessionId === null || completingSessionRef.current) {
      return;
    }

    completingSessionRef.current = true;

    void completePomodoroSession(activeSessionId)
      .then((session) => {
        setRecentSessions((prev) => [session, ...prev.filter((existing) => existing.id !== session.id)].slice(0, 5));
        setSessionError("");
      })
      .catch((error) => {
        setSessionError(error instanceof Error ? error.message : "No se pudo completar la sesión.");
      });
  }, [activeSessionId, timerState]);

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
          <ThemeAnim
            progress={progress}
            isPaused={isPaused}
            isActive={timerState !== "idle" && timerState !== "finished"}
          />
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
          {sessionError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {sessionError}
            </div>
          )}
          {timerState === "idle" ? (
            <Button
              onClick={startTimer}
              className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-[0_0_24px_rgba(236,72,153,0.4)] transition-all"
            >
              <Play className="size-5 mr-2" />
              Comenzar
            </Button>
          ) : timerState === "finished" ? (
            <div className="w-full space-y-4 text-center py-4">
              {/* Trophy */}
              <div className="text-7xl animate-bounce">🏆</div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-white">¡Sesión Completada!</p>
                <p className="text-sm text-muted-foreground">
                  {cycles} ciclo{cycles !== 1 ? "s" : ""} · {studyMinutes}min enfocado · {breakMinutes}min descanso
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={stopTimer}
                  className="flex-1 h-12 rounded-xl text-sm font-semibold bg-[#5D5FEF] hover:bg-[#4B4DDC] text-white"
                >
                  Nueva sesión
                </Button>
              </div>
            </div>
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

        <div className="mt-6 w-full rounded-xl border border-[#2A2A3E] bg-[#111127]/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Sesiones recientes</h3>
            <button
              type="button"
              onClick={() => void loadRecentSessions()}
              className="text-xs text-[#5D5FEF] hover:text-[#7B7DF7] transition-colors"
            >
              Recargar
            </button>
          </div>

          {recentSessionsError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {recentSessionsError}
            </div>
          ) : null}

          {!recentSessionsError && recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay sesiones guardadas.</p>
          ) : recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-xl border border-[#2A2A3E] bg-[#1A1A2E] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {THEMES[session.theme]?.label ?? "Pomodoro"} · {session.study_minutes}m
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.cycles} ciclo{session.cycles === 1 ? "" : "s"} · descanso {session.break_minutes}m
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      session.completed ? "text-green-400" : "text-amber-300"
                    }`}
                  >
                    {session.completed ? "Completa" : "En progreso"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
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
