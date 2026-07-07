import type { Rarity } from "../types";

export const RARITY: Record<Rarity, { label: string; color: string; glow: string; border: string; bg: string }> = {
  common:    { label: "일반", color: "#9ca3af", glow: "0 0 12px rgba(156,163,175,0.25)", border: "rgba(156,163,175,0.4)",  bg: "rgba(156,163,175,0.06)" },
  rare:      { label: "희귀", color: "#60a5fa", glow: "0 0 18px rgba(96,165,250,0.45)",  border: "rgba(96,165,250,0.55)", bg: "rgba(96,165,250,0.06)" },
  epic:      { label: "에픽", color: "#a855f7", glow: "0 0 22px rgba(168,85,247,0.55)",  border: "rgba(168,85,247,0.65)", bg: "rgba(168,85,247,0.06)" },
  legendary: { label: "전설", color: "#fbbf24", glow: "0 0 28px rgba(251,191,36,0.65), 0 0 55px rgba(251,191,36,0.28)", border: "rgba(251,191,36,0.8)", bg: "rgba(251,191,36,0.06)" },
};
