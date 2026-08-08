"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type DashboardMode = "creator" | "learner";

interface DashboardModeContextValue {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  isCreator: boolean;
  isLearner: boolean;
}

const DashboardModeContext = createContext<DashboardModeContextValue | null>(null);

const STORAGE_KEY = "sito_dashboard_mode";

export function DashboardModeProvider({
  children,
  defaultMode = "creator",
}: {
  children: ReactNode;
  defaultMode?: DashboardMode;
}) {
  const [mode, setModeState] = useState<DashboardMode>(defaultMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as DashboardMode | null;
      if (saved === "creator" || saved === "learner") {
        setModeState(saved);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setMode = (next: DashboardMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  // Avoid flash of wrong mode before hydration by still rendering children
  return (
    <DashboardModeContext.Provider
      value={{
        mode: hydrated ? mode : defaultMode,
        setMode,
        isCreator: (hydrated ? mode : defaultMode) === "creator",
        isLearner: (hydrated ? mode : defaultMode) === "learner",
      }}
    >
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  const ctx = useContext(DashboardModeContext);
  if (!ctx) {
    return {
      mode: "creator" as DashboardMode,
      setMode: () => undefined,
      isCreator: true,
      isLearner: false,
    };
  }
  return ctx;
}
