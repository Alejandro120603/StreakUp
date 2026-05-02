"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="theme-fire" themes={['theme-fire', 'theme-ice', 'theme-candy', 'theme-night', 'light', 'dark']} enableSystem={false} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
