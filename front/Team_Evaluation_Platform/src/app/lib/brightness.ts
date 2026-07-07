import type { Stats } from "../types";
import { totalPower } from "./cardMapping";

// ─── 밝기(Magnitude) 등급 시스템 ──────────────────────────────────────────────
// 이전 "전투력"(여섯 능력치 원점수 총합 × 2.5)의 새 이름. totalPower가 이미 같은 식
// (0~100 스케일 합 ÷ 4 = 원점수 합 × 2.5)이므로 계산은 그대로 쓰고 이름만 바꾼다.
export const brightnessOf = (s: Stats) => totalPower(s);

// 실제 항성 분광형처럼 밝을수록 청색, 어두울수록 적색으로 식는다.
// 이 등급 색은 은하 화면과 AI 분석 화면에서만 쓴다 — 다른 화면의 별 색(starColorFor)은
// 사람 식별용 고정 색이라 의미가 다르다.
export interface BrightnessGrade {
  key: "blue" | "white" | "yellow" | "red";
  label: string;   // 한국어 등급명
  en: string;      // HUD 라벨용 영문
  color: string;   // 별 코어 색
  glowC: string;   // 글로우용 rgb 삼중값
}

const BLUE:   BrightnessGrade = { key:"blue",   label:"청색", en:"BLUE",   color:"#7cb8ff", glowC:"96,160,255"  };
const WHITE:  BrightnessGrade = { key:"white",  label:"백색", en:"WHITE",  color:"#f2f6ff", glowC:"220,235,255" };
const YELLOW: BrightnessGrade = { key:"yellow", label:"황색", en:"YELLOW", color:"#ffd97a", glowC:"251,191,36"  };
const RED:    BrightnessGrade = { key:"red",    label:"적색", en:"RED",    color:"#ff8f80", glowC:"248,113,113" };

export function gradeForBrightness(b: number): BrightnessGrade {
  if (b >= 85) return BLUE;
  if (b >= 65) return WHITE;
  if (b >= 40) return YELLOW;
  return RED;
}

export function gradeForStats(s: Stats): BrightnessGrade {
  return gradeForBrightness(brightnessOf(s));
}
