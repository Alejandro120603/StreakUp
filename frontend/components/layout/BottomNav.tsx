"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", emoji: "🏠", label: "Inicio" },
  { href: "/habits", emoji: "✅", label: "Hábitos" },
  { href: "/stats", emoji: "📊", label: "Stats" },
  { href: "/profile", emoji: "👤", label: "Perfil" },
];

export function BottomNav() {
  const pathname = usePathname();

  // Esconder la nav en la pantalla de temporizador
  if (pathname === "/pomodoro") {
    return null;
  }

  return (
    <nav className="absolute bottom-0 left-0 right-0 h-[82px] bg-[#1c0f3d]/80 backdrop-blur-xl border-t border-white/20 grid grid-cols-4 z-20">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center font-extrabold transition-colors ${
              isActive ? "text-white" : "text-white/60"
            }`}
          >
            <span className="block text-[27px] mb-1 leading-none">
              {item.emoji}
            </span>
            <span className="text-xs">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
