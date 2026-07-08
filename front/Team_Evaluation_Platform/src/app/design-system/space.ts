// ─── Observatory design tokens (design.md 세계관: 별/관측소) ──────────────────
// 기존 DS(tokens.ts)는 아직 이 스타일로 옮기지 않은 화면(팀 관리/별 비교 등)이
// 계속 쓰므로 건드리지 않고, 이 파일에 새 팔레트를 추가로 둔다.
export const SPACE = {
  bg: "linear-gradient(160deg, #020617 0%, #081126 55%, #0B1736 100%)",
  bgDeep: "#020617",
  bgMid: "#081126",
  bgHigh: "#0B1736",
  accentSky: "#7DD3FC",
  accentTeal: "#5EEAD4",
  accentPurple: "#A78BFA",
  starWhite: "#eef4ff",
  starWhite2: "#f2f6ff",
  text: "#c6d6ef",
  textDim: "#a9bcd9",
  label: "#64789c",
  faint: "#3d4f70",
  border: "rgba(125,180,255,0.16)",
  borderStrong: "rgba(125,180,255,0.3)",
  panel: "linear-gradient(160deg, rgba(8,17,38,0.92), rgba(11,23,54,0.88))",
  buttonGradient: "linear-gradient(120deg, #7DD3FC, #5EEAD4)",
} as const;

export const FONT = {
  display: "'Space Grotesk', sans-serif",
  body: "'Noto Sans KR', sans-serif",
  hud: "'IBM Plex Mono', monospace",
} as const;

// design.md §3: 별 색 변주 — 참가자 id로 결정론적 색상을 골라 항상 같은 사람은 같은 색.
const STAR_COLORS: { color: string; glowC: string }[] = [
  { color: "#9ed2ff", glowC: "125,190,255" },
  { color: "#f2f6ff", glowC: "220,235,255" },
  { color: "#c4b0ff", glowC: "167,139,250" },
];
export function starColorFor(id: number) {
  return STAR_COLORS[id % STAR_COLORS.length];
}

// 사람 이름 대신 붙이는 관측 코드(MDM-011 형식). 순수 표시용 장식이며 실제 식별자는 아니다.
export function observatoryCode(id: number): string {
  return `MDM-${String(id).padStart(3, "0")}`;
}
