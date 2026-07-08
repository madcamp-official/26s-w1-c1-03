import type { Stats } from "../types";
import { totalPower } from "./starMapping";

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

// 밝기 스케일(가능 범위 15~150)을 스펙트럼 바에 놓기 위한 0~100% 위치.
// 실제 점수 폭(적 25점/황 25점/백 20점/청 65점)을 그대로 비율로 쓰면 청색 구간이 화면의
// 절반 가까이 차지해 나머지 세 등급이 비좁아 보인다. 그래서 값을 등급 경계(40/65/85)로
// 나눈 뒤 등급마다 정확히 25%씩 배정하고, 그 안에서만 실제 값 위치로 보간한다 — 네 등급이
// 시각적으로 비슷한 비중을 갖게 된다.
export const SPEC_MIN = 15, SPEC_MAX = 150;
export function spectrumPct(b: number): number {
  const clamp = (t: number) => Math.min(1, Math.max(0, t));
  if (b < 40) return clamp((b - SPEC_MIN) / (40 - SPEC_MIN)) * 25;
  if (b < 65) return 25 + clamp((b - 40) / (65 - 40)) * 25;
  if (b < 85) return 50 + clamp((b - 65) / (85 - 65)) * 25;
  return 75 + clamp((b - 85) / (SPEC_MAX - 85)) * 25;
}

// 스펙트럼 바 CSS 그라데이션 — 위 spectrumPct와 같은 25%씩 등분 경계를 그대로 쓴다.
const BLEND = 2.5; // 경계마다 좌우로 이 폭만큼만 부드럽게 섞는다.
export const SPECTRUM_GRADIENT = `linear-gradient(90deg,
  ${RED.color} 0%, ${RED.color} ${25 - BLEND}%,
  ${YELLOW.color} ${25 + BLEND}%, ${YELLOW.color} ${50 - BLEND}%,
  ${WHITE.color} ${50 + BLEND}%, ${WHITE.color} ${75 - BLEND}%,
  ${BLUE.color} ${75 + BLEND}%, ${BLUE.color} 100%)`;

// 밝기를 가상의 표면온도(K)로 환산 — 실제 항성처럼 적색(~3,600K)에서 청색(~10,000K+)으로
// 뜨거워지는 연출용 수치. 40→5,500K(황), 65→7,400K(백), 85→8,900K(청) 부근이 되도록 잡았다.
export const surfaceTempOf = (b: number) => Math.round((2500 + b * 75) / 100) * 100;
