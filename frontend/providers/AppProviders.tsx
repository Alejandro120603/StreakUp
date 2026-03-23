"use client";

import type { ReactNode } from "react";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // Placeholder composition for state/auth/query-client/theme providers.
  return <>{children}</>;
}
