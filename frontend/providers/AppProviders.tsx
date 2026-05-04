"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { drainSyncQueue, recoverInterruptedSync } from "@/services/sync/syncService";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    recoverInterruptedSync();

    if (typeof navigator !== "undefined" && navigator.onLine) {
      void drainSyncQueue();
    }

    function handleOnline() {
      void drainSyncQueue();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="theme-fire" themes={['theme-fire', 'theme-ice', 'theme-candy', 'theme-night', 'light', 'dark']} enableSystem={false} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
