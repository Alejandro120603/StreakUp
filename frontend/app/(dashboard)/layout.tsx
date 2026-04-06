"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ListChecks, BarChart3, UserCircle } from "lucide-react";
import type { ReactNode } from "react";
import { hasSavedSession } from "@/services/auth/authService";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/habits", icon: ListChecks, label: "Hábitos" },
  { href: "/stats", icon: BarChart3, label: "Stats" },
  { href: "/profile", icon: UserCircle, label: "Perfil" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Middleware is the primary guard on the web. This client check keeps
    // offline/mobile shells honest when request-time protection is unavailable.
    if (!hasSavedSession()) {
      router.replace("/login");
    } else {
      setSessionReady(true);
    }
  }, [router]);

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="size-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
