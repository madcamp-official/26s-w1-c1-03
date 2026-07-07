import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

// ─── Observatory 디자인 시스템 (design.md 기반) ────────────────────────────────
// "심우주 관측소" 세계관의 화면(로그인/AI 분석)에서 쓰는 공용 요소.
// 기존 DS 토큰(tokens.ts)과 분리해 두어, 아직 리디자인하지 않은 파트에 영향을 주지 않는다.

export const OBS = {
  bg: "linear-gradient(160deg,#020617 0%,#081126 55%,#0B1736 100%)",
  panel: "linear-gradient(155deg,rgba(11,23,54,.82),rgba(4,9,24,.9))",
  border: "1px solid rgba(125,180,255,.16)",
  borderSoft: "1px solid rgba(125,180,255,.12)",
  sky: "#7DD3FC",
  teal: "#5EEAD4",
  violet: "#A78BFA",
  starWhite: "#eef4ff",
  title: "#f2f6ff",
  body: "#c6d6ef",
  sub: "#a9bcd9",
  dim: "#64789c",
  faint: "#3d4f70",
  mono: "'IBM Plex Mono',monospace",
  display: "'Space Grotesk','Noto Sans KR',sans-serif",
  kr: "'Noto Sans KR',sans-serif",
  buttonGrad: "linear-gradient(120deg,#7DD3FC,#5EEAD4)",
} as const;

// 관측소 화면에서만 쓰는 keyframes/포커스 스타일. GlobalStyle을 건드리지 않도록
// SpaceBackground와 함께 화면 단위로 주입한다(중복 주입돼도 무해).
export function ObservatoryStyle() {
  return (
    <style>{`
      @keyframes obsTwk{0%,100%{opacity:.25}50%{opacity:1}}
      @keyframes obsNeb{0%{transform:translate(0,0) scale(1)}50%{transform:translate(3vw,-2vh) scale(1.08)}100%{transform:translate(0,0) scale(1)}}
      @keyframes obsNebB{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-2.5vw,2vh) scale(1.06)}100%{transform:translate(0,0) scale(1)}}
      @keyframes obsFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes obsFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
      @keyframes obsBlinkDim{50%{opacity:.25}}
      @keyframes obsStarBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
      @keyframes obsIntroBar{from{width:0}to{width:100%}}
      @keyframes obsSpinC{to{transform:translate(-50%,-50%) rotate(360deg)}}
      .obs-input{background:rgba(125,180,255,.05);border:1px solid rgba(125,180,255,.16);border-radius:2px;color:#eef4ff;outline:none;font-family:'Noto Sans KR',sans-serif;font-weight:300;transition:border-color .25s,box-shadow .25s}
      .obs-input::placeholder{color:#3d4f70}
      .obs-input:focus{border-color:rgba(125,211,252,.55);box-shadow:0 0 14px rgba(125,211,252,.12)}
      .obs-hover-bright{transition:color .2s,box-shadow .25s,border-color .25s}
      .obs-hover-bright:hover{color:#BAE6FD!important}
      .obs-chip{transition:border-color .25s,box-shadow .25s,color .2s}
      .obs-chip:hover:not(:disabled){border-color:rgba(125,211,252,.5);box-shadow:0 0 14px rgba(125,211,252,.15);color:#BAE6FD}
    `}</style>
  );
}

// 시드 고정 난수 — 렌더마다 별이 튀지 않게 한다.
function seededRandom(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// 깊은 우주 배경: 남색 그라데이션 + 표류하는 성운 + 반짝이는 입자 별 + 희미한 별자리 점선.
export function SpaceBackground({ density = 70, dimmed = false }: { density?: number; dimmed?: boolean }) {
  const stars = useMemo(() => {
    const rnd = seededRandom(7);
    return Array.from({ length: density }, (_, i) => {
      const size = rnd() < 0.85 ? 1 + rnd() * 1.4 : 2 + rnd() * 1.6;
      return {
        key: i,
        left: (rnd() * 100).toFixed(2) + "%",
        top: (rnd() * 100).toFixed(2) + "%",
        size,
        color: rnd() < 0.2 ? "#b9e3ff" : "#e8eefc",
        dur: (2.5 + rnd() * 5).toFixed(1),
        delay: (rnd() * 5).toFixed(1),
      };
    });
  }, [density]);

  const neb = (w: string, h: string, l: string, t: string, c: string, anim: string, dur: string): CSSProperties => ({
    position: "absolute", width: w, height: h, left: l, top: t, borderRadius: "50%",
    background: `radial-gradient(closest-side, ${c}, transparent 70%)`,
    filter: "blur(30px)", animation: `${anim} ${dur} ease-in-out infinite`, pointerEvents: "none",
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", opacity: dimmed ? 0.55 : 1 }}>
      <div style={neb("55vw", "48vh", "5vw", "8vh", "rgba(96,78,200,.15)", "obsNeb", "26s")} />
      <div style={neb("48vw", "52vh", "48vw", "42vh", "rgba(56,120,220,.13)", "obsNebB", "31s")} />
      <div style={neb("34vw", "36vh", "26vw", "55vh", "rgba(64,190,180,.08)", "obsNeb", "38s")} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <line x1="28" y1="34" x2="57" y2="50" stroke="rgba(140,175,235,.14)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 5" />
        <line x1="57" y1="50" x2="41" y2="68" stroke="rgba(140,175,235,.14)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 5" />
        <line x1="41" y1="68" x2="28" y2="34" stroke="rgba(140,175,235,.10)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 5" />
      </svg>
      {stars.map(s => (
        <div key={s.key} style={{
          position: "absolute", left: s.left, top: s.top, width: s.size, height: s.size,
          borderRadius: "50%", background: s.color, opacity: 0.7,
          animation: `obsTwk ${s.dur}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// 시스템 라벨: IBM Plex Mono, 대문자, 자간 넓게.
export function MonoLabel({ children, color = OBS.dim, size = 9.5, spacing = 3, style }: {
  children: ReactNode; color?: string; size?: number; spacing?: number; style?: CSSProperties;
}) {
  return (
    <span style={{ fontFamily: OBS.mono, fontSize: size, letterSpacing: spacing, color, ...style }}>
      {children}
    </span>
  );
}

// 홀로그램 계기판 패널: 반투명 남색 그라데이션 + 얇은 테두리 + 청록 코너 브래킷.
export function ObsPanel({ children, width, style, bracketColor = OBS.teal }: {
  children: ReactNode; width?: number | string; style?: CSSProperties; bracketColor?: string;
}) {
  const bracket = (pos: CSSProperties): CSSProperties => ({ position: "absolute", width: 18, height: 18, ...pos });
  return (
    <div style={{
      position: "relative", width, background: OBS.panel, border: OBS.border, borderRadius: 4,
      backdropFilter: "blur(10px)", boxSizing: "border-box", ...style,
    }}>
      <div style={bracket({ top: -1, left: -1, borderTop: `1px solid ${bracketColor}`, borderLeft: `1px solid ${bracketColor}` })} />
      <div style={bracket({ top: -1, right: -1, borderTop: `1px solid ${bracketColor}`, borderRight: `1px solid ${bracketColor}` })} />
      {children}
    </div>
  );
}

// 관측소용 입력 필드: 영문 mono 라벨 + 한국어 보조 라벨, 비밀번호 표시 토글 지원.
export function ObsField({ label, labelKr, type = "text", value, onChange, placeholder, autoComplete }: {
  label: string; labelKr?: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <MonoLabel size={9.5} spacing={2.5} color={OBS.dim}>
        {label}{labelKr && <span style={{ color: OBS.faint, marginLeft: 8, letterSpacing: 1 }}>· {labelKr}</span>}
      </MonoLabel>
      <div style={{ position: "relative" }}>
        <input
          className="obs-input"
          type={isPass ? (show ? "text" : "password") : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{ width: "100%", padding: "11px 13px", paddingRight: isPass ? 44 : 13, boxSizing: "border-box", fontSize: 13.5 }}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(s => !s)} className="obs-hover-bright" style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            fontFamily: OBS.mono, fontSize: 8.5, letterSpacing: 1.5, color: OBS.dim, padding: 4,
          }}>
            {show ? "HIDE" : "SHOW"}
          </button>
        )}
      </div>
    </div>
  );
}

// 주 버튼: 하늘색→청록 그라데이션, mono 대문자.
export function ObsButton({ children, onClick, disabled = false, type = "button", blink = false }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit"; blink?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "13px 0", borderRadius: 2, border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: OBS.mono, fontSize: 11, letterSpacing: 2.5,
      color: disabled ? "#4a5d80" : "#020617",
      background: disabled ? "rgba(125,180,255,.08)" : OBS.buttonGrad,
      boxShadow: disabled ? "none" : "0 0 22px rgba(94,234,212,.3)",
      transition: "all .4s",
      animation: blink ? "obsBlinkDim 1.1s ease-in-out infinite" : undefined,
    }}>
      {children}
    </button>
  );
}

// 경고/오류 문구: 세계관 언어의 mono 헤더 + 한국어 본문.
export function ObsError({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: "9px 12px", borderRadius: 2, background: "rgba(239,68,68,.06)",
      border: "1px solid rgba(239,68,68,.28)", animation: "obsFadeIn .4s both",
    }}>
      <div style={{ fontFamily: OBS.mono, fontSize: 8.5, letterSpacing: 2.5, color: "#f87171", marginBottom: 4 }}>⚠ SIGNAL REJECTED</div>
      <div style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.6, color: "#fca5a5", fontFamily: OBS.kr }}>{children}</div>
    </div>
  );
}
