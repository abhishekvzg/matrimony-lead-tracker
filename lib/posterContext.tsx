"use client";

import { createContext, useContext } from "react";
import type { SpokeBy } from "./types";

export const PosterContext = createContext<{
  poster: SpokeBy;
  switchPoster: () => void;
} | null>(null);

export function usePoster() {
  const ctx = useContext(PosterContext);
  if (!ctx) throw new Error("usePoster must be used within a PosterContext.Provider");
  return ctx;
}
