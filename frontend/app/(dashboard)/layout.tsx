"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, BarChart3, UserCircle } from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/habits", icon: ListChecks, label: "Hábitos" },
  { href: "/stats", icon: BarChart3, label: "Stats" },
  { href: "/profile", icon: UserCircle, label: "Perfil" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Main content */}
      <main className="flex-1 pb-20 w-full max-w-lg mx-auto px-4">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#2A2A3E] z-50">
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
                    ? "text-[#5D5FEF]"
                    : "text-[#8888AA] hover:text-white"
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
