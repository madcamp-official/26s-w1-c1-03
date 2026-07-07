import { Component, useState, useEffect, useRef, useMemo } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Lock, Eye, EyeOff, Search, X, Plus, Copy, Notebook, UserPlus, Check,
  Sparkles, Hash, Camera, Users, Star, Send, BarChart2, ChevronRight,
  User, LogOut, BookOpen, Swords, Shield, Zap, Heart, Info,
  CheckCircle2, Bot, SlidersHorizontal, ArrowUpDown,
  ChevronLeft, RefreshCw, Upload, AlertTriangle, Filter,
  ArrowDownWideNarrow, ArrowUpNarrowWide,
} from "lucide-react";
import {
  login as apiLogin, changePassword as apiChangePassword, getMyProfile,
  updateProfile as apiUpdateProfile, setInitialStats as apiSetInitialStats,
  uploadProfileImage as apiUploadProfileImage,
  getAccessToken, clearTokens, ApiError,
  listMyTeams, createTeam, joinTeam, getTeam,
  listTitles, listEvaluationTargets, submitEvaluation,
  listCards, getCard,
  createChatSession, sendChatMessage,
  type CardSummaryDto, type CardDetailDto, type TeamDetailDto, type TeamSummaryDto, type TitleDto, type UserProfileDto,
  type EvaluationTargetDto,
} from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────
type Rarity = "common" | "rare" | "epic" | "legendary";
type AuthPhase = "login" | "change-password" | "profile-setup";
type MainScreen = "pokedex" | "teams" | "evaluate" | "ai-analysis" | "compare" | "profile";
interface Stats { attack: number; defense: number; agility: number; teamwork: number; mana: number; health: number; }
interface TitleVote { title: string; votes: number; }
interface User { id: number; name: string; role: string; photo: string; bio: string; stats: Stats; titleVotes: TitleVote[]; rarity: Rarity; isUnlocked?: boolean; remainingCount?: number; }
interface ChatMessage { role: "user" | "ai"; text: string; }

// ─── Config ───────────────────────────────────────────────────────────────────
const RARITY: Record<Rarity, { label: string; color: string; glow: string; border: string; bg: string }> = {
  common:    { label: "일반", color: "#9ca3af", glow: "0 0 12px rgba(156,163,175,0.25)", border: "rgba(156,163,175,0.4)",  bg: "rgba(156,163,175,0.06)" },
  rare:      { label: "희귀", color: "#60a5fa", glow: "0 0 18px rgba(96,165,250,0.45)",  border: "rgba(96,165,250,0.55)", bg: "rgba(96,165,250,0.06)" },
  epic:      { label: "에픽", color: "#a855f7", glow: "0 0 22px rgba(168,85,247,0.55)",  border: "rgba(168,85,247,0.65)", bg: "rgba(168,85,247,0.06)" },
  legendary: { label: "전설", color: "#fbbf24", glow: "0 0 28px rgba(251,191,36,0.65), 0 0 55px rgba(251,191,36,0.28)", border: "rgba(251,191,36,0.8)", bg: "rgba(251,191,36,0.06)" },
};

// key는 백엔드 UserStats 필드명과 1:1로 맞물려 있어 그대로 두고, 사용자에게 보이는
// label/설명/아이콘만 새 여섯 스탯(체력/공격력/방어력/마력/민첩성/협동력)으로 바꿨다.
const STATS = [
  { key: "health", label: "체력",   Icon: Heart,    color: "#ef4444",
    desc: "프로젝트가 길어질수록 빛나는 생존형 스탯입니다.\n처음에는 모두가 의욕이 넘치지만, 마감이 가까워질수록 진짜 중요한 것은 끝까지 앉아 있는 힘입니다.\n\n체력이 높은 개발자는 오류가 계속 나도 쉽게 쓰러지지 않고, \"이거 한 번만 더 해보자\"를 반복하며 결국 결과물을 완성합니다.\n단, 체력만 믿고 무리하면 회복 포션인 커피가 필요해질 수 있습니다." },
  { key: "attack",        label: "공격력", Icon: Swords,   color: "#ff6b35",
    desc: "개발자가 코드를 통해 실제 기능을 만들어내는 힘입니다.\n공격력이 높은 개발자는 \"일단 만들어보자\" 정신으로 기능 구현을 빠르게 시작하고, 막히는 부분이 있어도 끝까지 밀고 나갑니다.\n\n다만 공격력만 너무 높으면 코드가 거칠어질 수 있습니다.\n\"돌아가긴 하는데 왜 돌아가는지는 모름\", \"내 컴퓨터에서는 됨\" 같은 부작용이 생길 수 있으므로 방어력과 함께 성장시키는 것이 좋습니다." },
  { key: "defense",       label: "방어력", Icon: Shield,   color: "#60a5fa",
    desc: "버그와 예외 상황을 막아내는 능력입니다.\n입력값이 이상할 때, 서버가 응답하지 않을 때, 데이터가 비어 있을 때도 서비스가 쉽게 무너지지 않게 버티는 힘입니다.\n\n방어력이 높은 개발자는 예상치 못한 상황에도 침착하게 대응합니다." },
  { key: "mana",    label: "마력",   Icon: Sparkles, color: "#a78bfa",
    desc: "아이디어와 집중력, 문제를 새롭게 바라보는 능력입니다.\n기능 이름을 재밌게 짓거나, 화면 흐름을 더 자연스럽게 만들거나, 팀 분위기를 살리는 능력이 포함됩니다.\n\n마나가 높은 개발자는 평범한 기능도 그럴듯하게 포장하는 힘이 있습니다.\n다만 마나를 너무 많이 쓰면 \"이 기능도 넣으면 재밌지 않을까?\" 하다가 프로젝트 범위가 과도하게 커질 수 있습니다." },
  { key: "agility",         label: "민첩성", Icon: Zap,      color: "#fbbf24",
    desc: "수정 요청이나 새로운 기술에 빠르게 반응하는 능력입니다.\n에러가 생겼을 때 검색하고, 고치고, 다시 시도하는 속도라고 볼 수 있습니다.\n\n민첩성이 높은 개발자는 피드백을 받으면 빠르게 움직이고, 필요한 내용을 금방 찾아 적용합니다.\n다만 가끔 너무 빨리 움직여서 같은 버그를 두 번 밟는 경우가 있습니다." },
  { key: "teamwork",      label: "협동력", Icon: Users,    color: "#34d399",
    desc: "팀 프로젝트에서 가장 중요한 스탯입니다.\n말을 잘 전달하고, 역할을 나누고, 다른 사람의 코드를 이해하고, 충돌이 생겼을 때 분위기를 망치지 않는 능력입니다.\n\n협동력이 높은 개발자는 혼자만 잘하는 것이 아니라 팀 전체가 앞으로 가도록 돕습니다." },
];

const AI_QUESTIONS = [
  "이 사람의 강점은?", "우리 팀 조합은 어때?", "누가 백엔드에 적합할까?",
  "팀의 시너지는?", "부족한 역할은?", "누굴 추가하면 좋을까?",
];

// 프로필 사진이 아직 없는 유저를 위한 기본 아바타
const FALLBACK_AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a2438"/><circle cx="50" cy="38" r="18" fill="#3a4a6a"/><ellipse cx="50" cy="92" rx="32" ry="24" fill="#3a4a6a"/></svg>'
);
// 프로필 사진 URL이 만료/삭제 등으로 로드 자체에 실패하면(단순히 null이라 ||로 대체되는
// 경우와 달리) 브라우저가 빈 아이콘만 남기고 영구히 방치하므로, 실패 시 폴백 아바타로 교체한다.
function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  if (e.currentTarget.src !== FALLBACK_AVATAR) e.currentTarget.src = FALLBACK_AVATAR;
}

// navigator.clipboard.writeText는 비보안 컨텍스트/포커스 상실 등에서 조용히 reject될 수 있어,
// 성공 여부를 실제로 확인하고 실패 시 구형 execCommand 방식으로 한 번 더 시도한다.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// StorageService(백엔드) 검증 규칙과 동일하게 클라이언트에서도 먼저 걸러준다.
const ALLOWED_IMAGE_TYPES = ["image/png","image/jpeg","image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5*1024*1024;
function validateProfileImage(file: File): string|null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "PNG, JPG, WEBP 형식만 업로드할 수 있습니다.";
  if (file.size > MAX_IMAGE_SIZE_BYTES) return "파일 크기는 5MB를 초과할 수 없습니다.";
  return null;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const topTitles = (v: TitleVote[]) => { if (!v.length) return []; const m = Math.max(...v.map(x=>x.votes)); return v.filter(x=>x.votes===m).map(x=>x.title); };
// 초기 능력치 총합 상한(6개 스탯 x 1~10점)이 실제로는 40으로 제한되어 있어(구조상 60까지
// 가능하지만 게임 밸런스상 40이 실질 최대치), 6이 아닌 4로 나눠야 100 만점 스케일이 맞는다.
const totalPower = (s: Stats) => Math.round(Object.values(s).reduce((a,b)=>a+b,0)/4);

// 잠긴 카드(평가 미완료 상태에서 내려오는 stats:null)에 쓰는 빈 스탯.
const ZERO_STATS: Stats = { attack:0, defense:0, agility:0, teamwork:0, mana:0, health:0 };

// 카드 도감 수치(1~10 EMA 점수)를 기존 육각형 차트가 가정하는 0~100 스케일로 맞춘다.
function dtoStatsToStats(s: NonNullable<CardSummaryDto["stats"]>): Stats {
  return {
    attack: s.attack*10, defense: s.defense*10, agility: s.agility*10,
    teamwork: s.teamwork*10, mana: s.mana*10, health: s.health*10,
  };
}
function rarityFromPower(power: number): Rarity {
  if (power>=85) return "legendary";
  if (power>=70) return "epic";
  if (power>=55) return "rare";
  return "common";
}
// 잠긴 카드는 stats가 null로 내려오므로(등급을 매길 근거가 없음), 그 경우 null을 반환한다.
function rarityFromCardStats(stats: CardSummaryDto["stats"] | null): Rarity | null {
  if (!stats) return null;
  return rarityFromPower(totalPower(dtoStatsToStats(stats)));
}
// 카드 도감(목록/상세) API 응답을 기존 화면 컴포넌트가 쓰는 User 모양으로 변환한다.
// 평가를 완료하지 않은 뷰어에게는 stats/titles가 null로 내려오므로(§CardService.evaluateLockStatus)
// 여기서 안전하게 빈 값으로 대체해야 화면이 그대로 죽지 않는다.
function cardToUser(c: CardSummaryDto | CardDetailDto): User {
  const stats = c.stats ? dtoStatsToStats(c.stats) : ZERO_STATS;
  const titles = "titles" in c ? c.titles : undefined;
  const titleVotes: TitleVote[] = titles
    ? titles.map(tv=>({ title: tv.name, votes: tv.voteCount }))
    : c.representativeTitles.map(name=>({ title: name, votes: 1 }));
  return {
    id: c.userId,
    name: c.name,
    role: "",
    photo: c.profileImageUrl || FALLBACK_AVATAR,
    bio: "biography" in c ? (c.biography ?? "") : "",
    stats,
    titleVotes,
    rarity: c.stats ? rarityFromPower(totalPower(stats)) : "common",
    isUnlocked: "isUnlocked" in c ? c.isUnlocked : undefined,
    remainingCount: "remainingCount" in c ? c.remainingCount : undefined,
  };
}
// 카드 목록(listCards)에 잠긴 카드가 하나라도 섞여 있으면 "평가 미완료" 상태로 본다.
// 실제로는 뷰어 단위로 전체가 동일하게 잠기지만(§CardService.evaluateLockStatus), 개별 항목을
// 봐도 안전하도록 some()으로 판단한다.
function deriveEvaluationLocked(cards: User[] | null): boolean {
  if (!cards) return false;
  return cards.some(c => c.isUnlocked === false);
}

function hexPoints(vals: number[], cx=50, cy=50, r=40): string {
  return vals.map((v,i)=>{
    const a=(i*60-90)*Math.PI/180, n=Math.min(v/100,1);
    return `${cx+r*n*Math.cos(a)},${cy+r*n*Math.sin(a)}`;
  }).join(" ");
}
function hexRing(scale: number, cx=50, cy=50, r=40): string {
  return [0,1,2,3,4,5].map(i=>{
    const a=(i*60-90)*Math.PI/180;
    return `${cx+r*scale*Math.cos(a)},${cy+r*scale*Math.sin(a)}`;
  }).join(" ");
}

// (기존에는 여기서 로컬 목업 AI 응답을 만들었지만, 이제 AIScreen이 실제 /api/chat 세션을 호출한다.)

// ─── Design System ────────────────────────────────────────────────────────────
const DS = {
  card: { background:"rgba(13,21,37,0.85)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16 },
  input: { background:"rgba(0,200,255,0.05)", border:"1px solid rgba(0,200,255,0.18)", color:"#dde5f0", borderRadius:10, outline:"none" },
  glass: { background:"rgba(255,255,255,0.04)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.07)" },
};

function Btn({ children, variant="primary", onClick, disabled=false, size="md", full=false, icon, type="button" }: {
  children: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"|"purple";
  onClick?: (e:React.MouseEvent<HTMLButtonElement>)=>void; disabled?: boolean; size?: "sm"|"md"|"lg"; full?: boolean; icon?: React.ReactNode; type?: "button"|"submit";
}) {
  const styles: Record<string,React.CSSProperties> = {
    primary:   { background:"linear-gradient(135deg,#00c8ff,#0080b0)", color:"#060c18" },
    secondary: { background:"rgba(0,200,255,0.1)", color:"#00c8ff", border:"1px solid rgba(0,200,255,0.25)" },
    ghost:     { background:"rgba(255,255,255,0.04)", color:"#8899bb", border:"1px solid rgba(255,255,255,0.08)" },
    danger:    { background:"rgba(239,68,68,0.12)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)" },
    purple:    { background:"linear-gradient(135deg,#a855f7,#6d28d9)", color:"#fff" },
  };
  const pad = { sm:"6px 12px", md:"10px 20px", lg:"13px 28px" };
  const fs =  { sm:"12px",     md:"13px",      lg:"14px" };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: pad[size],
        fontSize: fs[size],
        borderRadius: 10,
        fontFamily:"'Noto Sans KR'",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        width: full ? "100%" : undefined,
        transition: "all 0.18s",
        display:"flex", alignItems:"center", gap:6, justifyContent:"center",
      }}
    >
      {icon}{children}
    </button>
  );
}

function Field({ label, type="text", value, onChange, placeholder, error, right, autoComplete }: {
  label?: string; type?: string; value: string; onChange: (v:string)=>void;
  placeholder?: string; error?: string; right?: React.ReactNode; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{label}</span>}
      <div style={{ position:"relative" }}>
        <input
          type={isPass ? (show?"text":"password") : type}
          value={value}
          onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{ ...DS.input, width:"100%", padding:"11px 14px", paddingRight: isPass||right ? 42 : 14, boxSizing:"border-box", fontSize:14 }}
        />
        {isPass && (
          <button type="button" onClick={()=>setShow(s=>!s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#8899bb", cursor:"pointer" }}>
            {show ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        )}
        {right && <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)" }}>{right}</div>}
      </div>
      {error && <span style={{ fontSize:11, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{error}</span>}
    </div>
  );
}

// 능력치 이름/수치처럼 텍스트가 드래그·복사되는 대신, 마우스를 올리면 근처 고정
// 위치에 말풍선으로 설명을 띄우는 공용 처리. 능력치가 표시되는 다른 화면에서도 재사용한다.
// 말풍선을 트리거 바로 아래(position:absolute)에 두면, 스크롤 컨테이너나 표(overflow:auto)
// 안에서 열릴 때 그 컨테이너의 스크롤 영역 크기 계산에 말풍선 박스가 끼어들어 표/레이아웃이
// 미세하게 흔들리는 문제가 있었다. document.body에 포털로 그려 position:fixed로 좌표를
// 직접 계산하면 어떤 조상의 레이아웃/스크롤 크기에도 영향을 주지 않는다.
function InfoTooltip({ children, text, placement="bottom" }: { children: React.ReactNode; text: string; placement?: "top"|"bottom" }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{top:number;bottom:number;left:number;right:number}|null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function handleEnter() {
    const r = ref.current?.getBoundingClientRect();
    if (r) setRect({ top:r.top, bottom:r.bottom, left:r.left, right:r.right });
    setOpen(true);
  }

  const alignRight = rect ? (rect.left + (rect.right-rect.left)/2 > window.innerWidth/2) : false;

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={()=>setOpen(false)}
      style={{ position:"relative", display:"inline-flex", alignItems:"center", cursor:"help" }}
    >
      {children}
      {open && rect && createPortal(
        <div style={{
          position:"fixed", zIndex:1000,
          ...(placement==="top" ? { bottom: window.innerHeight-rect.top+9 } : { top: rect.bottom+9 }),
          ...(alignRight ? { right: window.innerWidth-rect.right } : { left: rect.left }),
          width:260, padding:"11px 14px", borderRadius:10,
          background:"#0e1526", border:"1px solid rgba(0,200,255,0.25)",
          boxShadow:"0 10px 30px rgba(0,0,0,0.5)",
          fontSize:11, lineHeight:1.65, color:"#c7d2e6", fontFamily:"'Noto Sans KR'",
          whiteSpace:"pre-line", pointerEvents:"none",
        }}>
          <div style={{
            position:"absolute", ...(placement==="top" ? { bottom:-6 } : { top:-6 }), ...(alignRight ? { right:14 } : { left:14 }),
            width:11, height:11, background:"#0e1526",
            ...(placement==="top"
              ? { borderRight:"1px solid rgba(0,200,255,0.25)", borderBottom:"1px solid rgba(0,200,255,0.25)" }
              : { borderLeft:"1px solid rgba(0,200,255,0.25)", borderTop:"1px solid rgba(0,200,255,0.25)" }),
            transform:"rotate(45deg)",
          }}/>
          {text}
        </div>,
        document.body
      )}
    </div>
  );
}

function StatSlider({ label, desc, value, onChange, color, Icon }: { label:string; desc?:string; value:number; onChange:(v:number)=>void; color:string; Icon:any }) {
  const labelNode = (
    <div style={{ display:"flex", alignItems:"center", gap:5, userSelect:"none" }}>
      <Icon size={13} style={{ color }} />
      <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{label}</span>
      {desc && <Info size={11} style={{ color:"#4a5a7a" }}/>}
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"space-between" }}>
        {desc ? <InfoTooltip text={desc}>{labelNode}</InfoTooltip> : labelNode}
        <span style={{ fontSize:13, fontFamily:"'Orbitron',monospace", color, fontWeight:700, userSelect:"none" }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e=>onChange(+e.target.value)}
        className="stat-range"
        style={{
          width:"100%", height:4, color,
          background:`linear-gradient(to right, ${color} 0%, ${color} ${(value-1)/9*100}%, rgba(255,255,255,0.12) ${(value-1)/9*100}%, rgba(255,255,255,0.12) 100%)`,
        }} />
    </div>
  );
}

function Pill({ label, color="#00c8ff", small=false }: { label:string; color?:string; small?:boolean }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      padding: small ? "1px 6px" : "4px 10px",
      borderRadius:999,
      fontSize: small ? 10 : 11,
      background:`${color}1a`,
      color,
      border:`1px solid ${color}44`,
      fontFamily:"'Noto Sans KR'",
      whiteSpace:"nowrap",
    }}>{label}</span>
  );
}

function Progress({ value, max=100, color="#00c8ff" }: { value:number; max?:number; color?:string }) {
  const pct = Math.min((value/max)*100, 100);
  return (
    <div style={{ width:"100%", height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:3, transition:"width 0.4s ease" }} />
    </div>
  );
}

// ─── SVG Hex Chart (mini, no recharts) ───────────────────────────────────────
function MiniHex({ stats, size=72, color="#00c8ff" }: { stats:Stats; size?:number; color?:string }) {
  const vals = STATS.map(s=>stats[s.key as keyof Stats]);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {[0.33,0.66,1].map((sc,i)=>(
        <polygon key={i} points={hexRing(sc)} fill="none" stroke="rgba(0,200,255,0.14)" strokeWidth={0.6}/>
      ))}
      {[0,1,2,3,4,5].map(i=>{
        const a=(i*60-90)*Math.PI/180;
        return <line key={i} x1={50} y1={50} x2={50+40*Math.cos(a)} y2={50+40*Math.sin(a)} stroke="rgba(0,200,255,0.1)" strokeWidth={0.5}/>;
      })}
      <polygon points={hexPoints(vals)} fill={`${color}30`} stroke={color} strokeWidth={1.5}/>
      {vals.map((v,i)=>{
        const a=(i*60-90)*Math.PI/180, n=Math.min(v/100,1);
        return <circle key={i} cx={50+40*n*Math.cos(a)} cy={50+40*n*Math.sin(a)} r={2.5} fill={color}/>;
      })}
    </svg>
  );
}

// recharts의 PolarAngleAxis는 축마다 라벨을 그래프 바깥으로 밀어내는 정도가 미묘하게
// 달라(특히 아래쪽 꼭짓점) 마력 라벨이 그래프와 겹치는 문제를 percent/margin 조정만으로는
// 없앨 수 없었다. MiniHex와 같은 방식으로 좌표를 직접 계산해 그리면, 그래프 반경(r)과
// 라벨 반경(labelR) 사이의 간격을 모든 꼭짓점에 대해 항상 동일하게 보장할 수 있다.
function BigHex({ stats, size=260, users, colors }: { stats?:Stats; size?:number; users?:User[]; colors?:string[] }) {
  const defaultColors = ["#00c8ff","#a855f7","#fbbf24"];
  // labelR-r 간격은 viewBox 단위라 렌더 크기(size)에 비례해 그대로 확대된다 — size가 커질수록
  // 그래프와 글씨 사이가 실제 화면에서 점점 더 멀어 보이는 원인이었다. 목표 픽셀 간격을 정해두고
  // size에 반비례하는 viewBox 간격을 역산하면, 카드 크기와 무관하게 실제 여백이 일정해진다.
  const TARGET_GAP_PX = 15;
  const cx=50, cy=50, r=32, labelR=r + (TARGET_GAP_PX*100)/size;
  const n = STATS.length;
  const angleOf = (i:number) => (i*360/n - 90) * Math.PI/180;

  const series = stats
    ? [{ color:"#00c8ff", vals: STATS.map(s=>stats[s.key as keyof Stats]) }]
    : (users??[]).map((u,i)=>({ color:(colors??defaultColors)[i], vals: STATS.map(s=>u.stats[s.key as keyof Stats]) }));

  return (
    <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0 }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow:"visible", flexShrink:0 }}>
        {[0.33,0.66,1].map((sc,i)=>(
          <polygon key={i} points={hexRing(sc,cx,cy,r)} fill="none" stroke="rgba(0,200,255,0.15)" strokeWidth={0.5}/>
        ))}
        {STATS.map((_,i)=>{
          const a=angleOf(i);
          return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="rgba(0,200,255,0.12)" strokeWidth={0.4}/>;
        })}
        {series.map((s,i)=>(
          <polygon key={i} points={hexPoints(s.vals,cx,cy,r)} fill={`${s.color}30`} stroke={s.color} strokeWidth={1.2}/>
        ))}
        {STATS.map((s,i)=>{
          const a = angleOf(i);
          const cosA = Math.cos(a), sinA = Math.sin(a);
          const lx = cx + labelR*cosA, ly = cy + labelR*sinA;
          const anchor = Math.abs(cosA)<0.35 ? "middle" : cosA>0 ? "start" : "end";
          const baseline = Math.abs(sinA)<0.35 ? "middle" : sinA>0 ? "hanging" : "baseline";
          return (
            <text key={s.key} x={lx} y={ly} textAnchor={anchor} dominantBaseline={baseline} fill="#8899bb" fontSize={5.6} fontFamily="'Noto Sans KR'">
              {s.label}
            </text>
          );
        })}
      </svg>
      {users && users.length>1 && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
          {users.map((u,i)=>(
            <div key={u.id} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:999, background:(colors??defaultColors)[i] }}/>
              <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{u.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card Components ──────────────────────────────────────────────────────────
function CardFront({ user }: { user:User }) {
  const r = RARITY[user.rarity];
  const top = topTitles(user.titleVotes);
  return (
    <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ position:"relative", flex:"0 0 54%", background:"#060c18", overflow:"hidden" }}>
        <img src={user.photo} alt={user.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.82) saturate(1.1)" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 45%,#0d1525 100%)" }}/>
        <div style={{ position:"absolute", top:8, right:8, padding:"2px 7px", borderRadius:6, background:`${r.color}22`, color:r.color, border:`1px solid ${r.color}55`, fontSize:9, fontFamily:"'Noto Sans KR'", fontWeight:700 }}>{r.label}</div>
        <div style={{ position:"absolute", top:8, left:8, padding:"2px 7px", borderRadius:6, background:"rgba(0,0,0,0.6)", color:"#8899bb", fontSize:9, fontFamily:"'Orbitron',monospace" }}>PWR <span style={{color:r.color,fontWeight:700}}>{totalPower(user.stats)}</span></div>
      </div>
      {/* 이름/칭호가 길어져 줄바꿈되어도 오른쪽 그래프는 독립된 flex 칸이라 밀려 내려가거나
          잘리지 않는다(이전엔 grid 2행 구조라 1행 높이가 늘어나면 2행의 그래프가 카드
          밖으로 밀려 잘렸다). */}
      <div style={{ padding:"10px 12px", display:"flex", alignItems:"center", gap:8, flex:1, minHeight:0 }}>
        <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:4, justifyContent:"center" }}>
          <div style={{
            fontSize:15, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", lineHeight:1.25,
            display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
          }}>{user.name}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
            {top.map(t=><Pill key={t} label={t} color={r.color} small/>)}
          </div>
        </div>
        <div style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <MiniHex stats={user.stats} size={58} color={r.color}/>
        </div>
      </div>
    </div>
  );
}

function CardBack({ user, hexSize=170 }: { user:User; hexSize?:number }) {
  const r = RARITY[user.rarity];
  return (
    <div style={{ width:"100%", height:"100%", padding:"12px", display:"flex", flexDirection:"column", gap:10, overflow:"visible" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:r.color }}>{user.name}</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:10, background:`${r.color}18`, color:r.color, padding:"2px 7px", borderRadius:6 }}>{totalPower(user.stats)} PT</span>
      </div>
      <BigHex stats={user.stats} size={hexSize}/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 12px", marginTop:2 }}>
        {STATS.map(s=>(
          <div key={s.key} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <InfoTooltip text={s.desc}>
              <div style={{ display:"flex", alignItems:"center", gap:4, userSelect:"none" }}>
                <s.Icon size={10} style={{color:s.color}}/>
                <span style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{s.label}</span>
              </div>
            </InfoTooltip>
            <span style={{ marginLeft:"auto", fontSize:11, fontFamily:"'Orbitron',monospace", color:s.color, fontWeight:700, userSelect:"none" }}>{user.stats[s.key as keyof Stats]}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop:"1px solid rgba(0,200,255,0.1)", paddingTop:6 }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:5 }}>
          {user.titleVotes.map(tv=>(
            <span key={tv.title} style={{ fontSize:9, padding:"2px 6px", borderRadius:999, background:"rgba(0,200,255,0.08)", color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>
              {tv.title} <span style={{color:"#00c8ff"}}>{tv.votes}</span>
            </span>
          ))}
        </div>
        <p style={{ fontSize:10, color:"#4a5a7a", fontFamily:"'Noto Sans KR'", fontStyle:"italic", lineHeight:1.4 }}>"{user.bio}"</p>
      </div>
    </div>
  );
}

function FlipCard({ user, w=200, h=320, locked=false, onUnlock, hexSize, flippable=true }: { user:User; w?:number; h?:number; locked?:boolean; onUnlock?:()=>void; hexSize?:number; flippable?:boolean }) {
  const [flipped, setFlipped] = useState(false);
  const r = RARITY[user.rarity];
  return (
    <div style={{ width:w, height:h, perspective:1200, cursor:flippable?"pointer":"default", flexShrink:0 }} onClick={()=>{ if(flippable && !locked) setFlipped(f=>!f); }}>
      <div style={{ width:"100%", height:"100%", transformStyle:"preserve-3d", transition:"transform 0.6s cubic-bezier(0.4,0,0.2,1)", transform:flipped?"rotateY(180deg)":"rotateY(0deg)", position:"relative" }}>
        {/* Front */}
        <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", borderRadius:14, border:`1.5px solid ${r.border}`, boxShadow:r.glow, background:"#0d1525", overflow:"hidden" }}>
          <CardFront user={user}/>
          {locked && (
            <div style={{ position:"absolute", inset:0, backdropFilter:"blur(8px)", background:"rgba(6,9,18,0.72)", borderRadius:14, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
              <div style={{ width:48, height:48, borderRadius:999, background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Lock size={22} style={{color:"#fbbf24"}}/>
              </div>
              <p style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'", textAlign:"center", padding:"0 16px" }}>평가를 완료하면{"\n"}상세 정보를 확인할 수 있습니다</p>
              {onUnlock && <Btn size="sm" variant="secondary" onClick={e=>{e.stopPropagation();onUnlock();}}>평가하러 가기</Btn>}
            </div>
          )}
        </div>
        {/* Back */}
        <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", transform:"rotateY(180deg)", borderRadius:14, border:`1.5px solid ${r.border}`, boxShadow:r.glow, background:"#0d1525", overflow:"visible" }}>
          <CardBack user={user} hexSize={hexSize}/>
        </div>
      </div>
    </div>
  );
}

function GridCard({ user, onClick, locked=false }: { user:User; onClick:()=>void; locked?:boolean }) {
  const [hover, setHover] = useState(false);
  const activeHover = hover && !locked;
  const r = RARITY[user.rarity];
  const top = topTitles(user.titleVotes);
  return (
    <div
      onClick={locked ? undefined : onClick}
      onMouseEnter={()=>!locked && setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        width:158, flexShrink:0,
        background:"#0d1525",
        borderRadius:14,
        border:`1.5px solid ${activeHover?r.border:"rgba(255,255,255,0.07)"}`,
        boxShadow:activeHover?r.glow:"none",
        overflow:"hidden",
        cursor:locked?"default":"pointer",
        transition:"all 0.22s",
        transform:activeHover?"translateY(-5px) scale(1.03)":"none",
      }}
    >
      <div style={{ height:140, background:"#060c18", position:"relative", overflow:"hidden" }}>
        <img src={user.photo} alt={user.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.8)" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 50%,#0d1525 100%)" }}/>
        {!locked && <span style={{ position:"absolute", top:6, right:6, fontSize:9, padding:"2px 6px", borderRadius:5, background:`${r.color}22`, color:r.color, fontFamily:"'Noto Sans KR'", fontWeight:700 }}>{r.label}</span>}
        {!locked && <span style={{ position:"absolute", top:6, left:6, padding:"2px 7px", borderRadius:5, background:"rgba(0,0,0,0.6)", color:"#8899bb", fontSize:9, fontFamily:"'Orbitron',monospace" }}>PWR <span style={{color:r.color,fontWeight:700}}>{totalPower(user.stats)}</span></span>}
      </div>
      {locked ? (
        <div style={{ padding:"8px 10px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0" }}>{user.name}</div>
        </div>
      ) : (
        <div style={{ padding:"8px 10px", display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:3 }}>
            <div style={{
              fontSize:13, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", lineHeight:1.25,
              display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
            }}>{user.name}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
              {top.map(t=><Pill key={t} label={t} color={r.color} small/>)}
            </div>
          </div>
          <div style={{ flexShrink:0 }}>
            <MiniHex stats={user.stats} size={52} color={r.color}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Auth Screens ─────────────────────────────────────────────────────────────
function LoginScreen({ onLoginSuccess }: { onLoginSuccess:(passwordChanged:boolean)=>void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  async function handle() {
    if (!id||!pw){setErr("아이디와 비밀번호를 입력해주세요."); return;}
    setErr(""); setLoading(true);
    try {
      const res = await apiLogin(id, pw);
      onLoginSuccess(res.passwordChanged);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#070b12", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 20% 20%, rgba(0,200,255,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.06) 0%, transparent 50%)" }}/>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(0,200,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,255,0.04) 1px,transparent 1px)", backgroundSize:"40px 40px" }}/>
      <div style={{ ...DS.card, width:380, padding:"40px 36px", position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,rgba(0,200,255,0.2),rgba(168,85,247,0.2))", border:"1px solid rgba(0,200,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
            <Notebook size={26} style={{color:"#00c8ff"}}/>
          </div>
          <h1 style={{ fontSize:22, fontFamily:"'Noto Sans KR'", color:"#00c8ff", fontWeight:700 }}>매드몬 도감</h1>
        </div>
        <form onSubmit={e=>{ e.preventDefault(); handle(); }} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="아이디" value={id} onChange={setId} placeholder="아이디 입력" autoComplete="username"/>
          <Field label="비밀번호" type="password" value={pw} onChange={setPw} placeholder="비밀번호 입력" autoComplete="current-password"/>
          {err && <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)" }}>
            <AlertTriangle size={13} style={{color:"#ef4444",flexShrink:0}}/>
            <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>
          </div>}
          <Btn full type="submit" disabled={loading} icon={loading?<RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/>:undefined}>
            {loading?"로그인 중...":"로그인"}
          </Btn>
          <p style={{ fontSize:11, color:"#4a5a7a", textAlign:"center", fontFamily:"'Noto Sans KR'" }}>
            초기 아이디/비밀번호: 인스타 아이디
          </p>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordScreen({ onDone }: { onDone:()=>void }) {
  const [cur, setCur] = useState("");
  const [np, setNp] = useState("");
  const [nc, setNc] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  async function handle() {
    if (!cur){setErr("현재 비밀번호를 입력해주세요."); return;}
    if (np.length<8||np.length>100){setErr("새 비밀번호는 8자 이상 100자 이하여야 합니다."); return;}
    if (np!==nc){setErr("새 비밀번호가 일치하지 않습니다."); return;}
    setErr(""); setLoading(true);
    try {
      await apiChangePassword(cur, np);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#070b12", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 50% 30%, rgba(168,85,247,0.08) 0%, transparent 60%)" }}/>
      <div style={{ ...DS.card, width:400, padding:"38px 36px", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:24 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(0,200,255,0.2),rgba(168,85,247,0.2))", border:"1px solid rgba(0,200,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Notebook size={15} style={{color:"#00c8ff"}}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontFamily:"'Noto Sans KR'", color:"#00c8ff", fontWeight:700 }}>매드몬 도감</div>
            <div style={{ fontSize:9, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>팀원 평가 플랫폼</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Lock size={16} style={{color:"#a855f7"}}/>
          </div>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0" }}>비밀번호 변경</h2>
            <p style={{ fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>최초 로그인 시 비밀번호를 변경해주세요</p>
          </div>
        </div>
        <form onSubmit={e=>{ e.preventDefault(); handle(); }} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="현재 비밀번호" type="password" value={cur} onChange={setCur} placeholder="기존 비밀번호" autoComplete="current-password"/>
          <Field label="새 비밀번호" type="password" value={np} onChange={setNp} placeholder="8자 이상" autoComplete="new-password"/>
          <Field label="새 비밀번호 확인" type="password" value={nc} onChange={setNc} placeholder="다시 입력" autoComplete="new-password"/>
          {err && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>}
          <Btn full type="submit" variant="purple" disabled={loading}>{loading?"변경 중...":"변경하기"}</Btn>
        </form>
      </div>
    </div>
  );
}

function ProfileSetupScreen({ onDone }: { onDone:()=>void }) {
  const [step, setStep] = useState<"photo"|"bio"|"stats">("photo");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string|null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [stats, setStats] = useState({attack:5,defense:5,agility:5,teamwork:5,health:5,mana:5});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const steps = ["photo","bio","stats"];
  const stepIdx = steps.indexOf(step);
  const statSum = STATS.reduce((sum,s)=>sum+stats[s.key as keyof typeof stats],0);
  const statsValid = statSum>=6 && statSum<=40;

  function handleEnterKey(e: React.KeyboardEvent, action: ()=>void) {
    if (e.key!=="Enter" || (e.target as HTMLElement).tagName==="TEXTAREA") return;
    e.preventDefault();
    action();
  }

  async function handlePhotoSelected(file: File) {
    const invalid = validateProfileImage(file);
    if (invalid) { setErr(invalid); return; }
    setErr(""); setPhotoUploading(true);
    try {
      const profile = await apiUploadProfileImage(file);
      setPhotoUrl(profile.profileImageUrl);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function saveBioAndContinue() {
    setErr(""); setLoading(true);
    try {
      await apiUpdateProfile({ biography: bio });
      setStep("stats");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "자기소개 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveStatsAndFinish() {
    setErr(""); setLoading(true);
    try {
      await apiSetInitialStats(stats);
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.errorCode === "INITIAL_STATS_ALREADY_SET") { onDone(); return; }
      setErr(e instanceof ApiError ? e.message : "초기 능력치 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{ minHeight:"100vh", background:"#070b12", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 70% 50%, rgba(0,200,255,0.05) 0%, transparent 60%)" }}/>
      <div style={{ ...DS.card, width:460, padding:"38px 36px", position:"relative", zIndex:1 }}>
        {/* Stepper */}
        <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28 }}>
          {["프로필 사진","자기소개","초기 능력치"].map((s,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", flex:i<2?1:undefined }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:26, height:26, borderRadius:999, border:`2px solid ${i<=stepIdx?"#00c8ff":"rgba(255,255,255,0.15)"}`, background:i<stepIdx?"#00c8ff":i===stepIdx?"rgba(0,200,255,0.15)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>
                  {i<stepIdx?<Check size={13} style={{color:"#060c18"}}/>:<span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:i<=stepIdx?"#00c8ff":"#4a5a7a" }}>{i+1}</span>}
                </div>
                <span style={{ fontSize:10, color:i===stepIdx?"#00c8ff":"#4a5a7a", fontFamily:"'Noto Sans KR'", whiteSpace:"nowrap" }}>{s}</span>
              </div>
              {i<2 && <div style={{ flex:1, height:1, background:i<stepIdx?"#00c8ff":"rgba(255,255,255,0.1)", margin:"0 8px", marginBottom:18, transition:"background 0.3s" }}/>}
            </div>
          ))}
        </div>

        {step==="photo" && (
          <div onKeyDown={e=>handleEnterKey(e,()=>{ if(!photoUploading) setStep("bio"); })} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display:"none" }}
              onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoSelected(f); e.target.value=""; }}/>
            <div
              onClick={()=>!photoUploading&&fileInputRef.current?.click()}
              style={{ width:120, height:120, borderRadius:999, border:`2px dashed ${photoUrl?"rgba(52,211,153,0.6)":"rgba(0,200,255,0.3)"}`, background:"rgba(0,200,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", cursor:photoUploading?"wait":"pointer", position:"relative", overflow:"hidden", transition:"all 0.2s" }}
            >
              {photoUploading
                ? <RefreshCw size={24} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/>
                : photoUrl
                ? <img src={photoUrl} alt="" onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:999 }}/>
                : <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <Camera size={28} style={{color:"#00c8ff"}}/>
                    <span style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>클릭하여 업로드</span>
                  </div>
              }
            </div>
            {photoUrl && <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#34d399", fontFamily:"'Noto Sans KR'" }}><CheckCircle2 size={14}/>사진이 설정되었습니다</div>}
            {err && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>}
            <div style={{ width:"100%", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Btn full variant="ghost" onClick={()=>setStep("bio")} disabled={photoUploading}>나중에 설정</Btn>
              <Btn full onClick={()=>setStep("bio")} disabled={photoUploading}>다음</Btn>
            </div>
          </div>
        )}

        {step==="bio" && (
          <div onKeyDown={e=>handleEnterKey(e,()=>{ if(!loading) saveBioAndContinue(); })} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>한줄 자기소개</span>
                <span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:bio.length>45?"#ef4444":"#4a5a7a" }}>{bio.length}/50</span>
              </div>
              <textarea
                value={bio}
                onChange={e=>e.target.value.length<=50&&setBio(e.target.value)}
                placeholder="나를 한 문장으로 소개한다면?"
                rows={3}
                style={{ ...DS.input, width:"100%", padding:"11px 14px", resize:"none", fontFamily:"'Noto Sans KR'", fontSize:14, lineHeight:1.6, boxSizing:"border-box" }}
              />
            </div>
            {err && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Btn full variant="ghost" onClick={()=>setStep("photo")}>이전</Btn>
              <Btn full onClick={saveBioAndContinue} disabled={loading}>{loading?"저장 중...":"다음"}</Btn>
            </div>
          </div>
        )}

        {step==="stats" && (
          <div onKeyDown={e=>handleEnterKey(e,()=>{ if(!loading&&statsValid) saveStatsAndFinish(); })} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:2 }}>자신의 초기 능력치를 입력하세요 (1-10)</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 24px" }}>
              {STATS.map(s=>(
                <StatSlider key={s.key} label={s.label} desc={s.desc} value={stats[s.key as keyof typeof stats]} onChange={v=>setStats(p=>({...p,[s.key]:v}))} color={s.color} Icon={s.Icon}/>
              ))}
            </div>
            <div style={{ padding:"12px", borderRadius:10, background:"rgba(0,200,255,0.04)", border:"1px solid rgba(0,200,255,0.1)", marginTop:4, position:"relative" }}>
              <div style={{ display:"flex", justifyContent:"center" }}>
                <MiniHex stats={Object.fromEntries(STATS.map(s=>[s.key, stats[s.key as keyof typeof stats]*10])) as unknown as Stats} size={100} color="#00c8ff"/>
              </div>
              <span style={{ position:"absolute", left:14, bottom:12, fontSize:20, fontFamily:"'Orbitron',monospace", fontWeight:800, color: statsValid?"#00c8ff":"#ef4444" }}>{statSum}</span>
            </div>
            {!statsValid && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>초기 능력치 총합을 6-40 사이로 설정해주세요.</span>}
            {err && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Btn full variant="ghost" onClick={()=>setStep("bio")}>이전</Btn>
              <Btn full variant="purple" onClick={saveStatsAndFinish} disabled={loading||!statsValid} icon={loading?undefined:<CheckCircle2 size={14}/>}>{loading?"저장 중...":"완료"}</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV = [
  { id:"pokedex" as MainScreen,     label:"도감",       Icon:BookOpen  },
  { id:"teams" as MainScreen,       label:"팀 관리",    Icon:Users     },
  { id:"evaluate" as MainScreen,    label:"팀원 평가",  Icon:Star      },
  { id:"ai-analysis" as MainScreen, label:"AI 분석",    Icon:Sparkles  },
  { id:"compare" as MainScreen,     label:"카드 비교",  Icon:BarChart2 },
  { id:"profile" as MainScreen,     label:"내 프로필",  Icon:User      },
];

function Sidebar({ screen, setScreen, onLogout }: { screen:MainScreen; setScreen:(s:MainScreen)=>void; onLogout:()=>void }) {
  const [me, setMe] = useState<UserProfileDto|null>(null);
  useEffect(()=>{ getMyProfile().then(setMe).catch(()=>{}); },[]);
  return (
    <aside style={{ width:220, minHeight:"100vh", background:"rgba(5,8,16,0.96)", backdropFilter:"blur(12px)", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"20px 18px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(0,200,255,0.2),rgba(168,85,247,0.2))", border:"1px solid rgba(0,200,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Notebook size={15} style={{color:"#00c8ff"}}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontFamily:"'Noto Sans KR'", color:"#00c8ff", fontWeight:700 }}>매드몬 도감</div>
            <div style={{ fontSize:9, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>팀원 평가 플랫폼</div>
          </div>
        </div>
      </div>
      <nav style={{ flex:1, padding:"10px 10px" }}>
        {NAV.map(item=>{
          const active = screen===item.id;
          return (
            <button
              key={item.id}
              onClick={()=>setScreen(item.id)}
              style={{
                width:"100%", display:"flex", alignItems:"center", gap:9,
                padding:"10px 12px", borderRadius:9, marginBottom:2,
                background:active?"rgba(0,200,255,0.12)":"transparent",
                color:active?"#00c8ff":"#8899bb",
                border:`1px solid ${active?"rgba(0,200,255,0.25)":"transparent"}`,
                fontSize:13, fontFamily:"'Noto Sans KR'", fontWeight:active?700:400,
                cursor:"pointer", textAlign:"left", transition:"all 0.15s",
              }}
            >
              <item.Icon size={15}/>
              {item.label}
              {active && <ChevronRight size={12} style={{marginLeft:"auto"}}/>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"12px 10px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 10px", borderRadius:9, background:"rgba(255,255,255,0.03)" }}>
          <div style={{ width:30, height:30, borderRadius:999, overflow:"hidden", border:`2px solid ${RARITY.legendary.color}`, flexShrink:0 }}>
            <img src={me?.profileImageUrl || FALLBACK_AVATAR} alt="" onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{me?.name ?? "..."}</div>
          </div>
          <button onClick={onLogout} style={{ background:"none", border:"none", color:"#4a5a7a", cursor:"pointer", padding:4 }} title="로그아웃"><LogOut size={13}/></button>
        </div>
      </div>
    </aside>
  );
}

// ─── Pokedex Screen ───────────────────────────────────────────────────────────
function PokedexScreen({ onEval }: { onEval:()=>void }) {
  const [cards, setCards] = useState<User[]|null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Rarity|"all">("all");
  const [sort, setSort] = useState<"name"|"power"|"stat">("power");
  const [sortStat, setSortStat] = useState<string>(STATS[0].key);
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [statMenuOpen, setStatMenuOpen] = useState(false);
  const [modalSummary, setModalSummary] = useState<User|null>(null);
  const [modalDetail, setModalDetail] = useState<User|null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const rarities: (Rarity|"all")[] = ["all","legendary","epic","rare","common"];

  useEffect(()=>{
    listCards()
      .then(list=>setCards(list.map(cardToUser)))
      .catch(e=>setError(e instanceof ApiError ? e.message : "카드 도감을 불러오지 못했습니다."));
  },[]);

  // 평가를 완료하지 않았으면 카드 상세(등급/파워 등)를 볼 수 없으므로, 그 정보에 기대는
  // 정렬·등급 필터는 의미가 없다 — 틀은 그대로 두되 기능은 이름순 고정으로 무력화한다.
  const locked = deriveEvaluationLocked(cards);

  const filtered = useMemo(()=>{
    if (!cards) return [];
    let u = cards.filter(u=>u.name.includes(search));
    if (locked) return [...u].sort((a,b)=>a.name.localeCompare(b.name));
    if (filter!=="all") u=u.filter(x=>x.rarity===filter);
    const dirMul = sortDir==="asc" ? 1 : -1;
    return [...u].sort((a,b)=>{
      if (sort==="name") return a.name.localeCompare(b.name)*dirMul;
      if (sort==="stat") return (a.stats[sortStat as keyof Stats]-b.stats[sortStat as keyof Stats])*dirMul;
      return (totalPower(a.stats)-totalPower(b.stats))*dirMul;
    });
  },[cards,search,filter,sort,sortStat,sortDir,locked]);

  async function openCard(u: User) {
    setModalSummary(u); setModalDetail(null); setModalLoading(true);
    try {
      const detail = await getCard(u.id);
      setModalDetail(cardToUser(detail));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "카드 상세 정보를 불러오지 못했습니다.");
    } finally {
      setModalLoading(false);
    }
  }

  const modal = modalDetail ?? modalSummary;

  if (error) return <div style={{ padding:"28px 32px" }}><p style={{ color:"#ef4444", fontFamily:"'Noto Sans KR'", fontSize:13 }}>{error}</p></div>;
  if (!cards) return <div style={{ padding:"28px 32px", display:"flex", alignItems:"center", gap:8 }}><RefreshCw size={16} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:13 }}>도감을 불러오는 중...</span></div>;

  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:4 }}>몰입캠프 도감</h1>
        <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>전체 {cards.length}명의 참가자 카드</p>
        {locked && <p style={{ fontSize:12, color:"#fbbf24", fontFamily:"'Noto Sans KR'", marginTop:6 }}>평가를 완료하면 카드 상세 정보와 정렬·필터 기능을 사용할 수 있습니다.</p>}
      </div>

      {/* Controls */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:8, alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px", borderRadius:9, ...DS.glass, flex:"1 1 200px", minWidth:160 }}>
          <Search size={13} style={{color:"#8899bb",flexShrink:0}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름 검색" style={{ background:"none", border:"none", outline:"none", color:"#dde5f0", fontSize:13, fontFamily:"'Noto Sans KR'", width:"100%" }}/>
        </div>
        <div style={{ display:"flex", gap:5, opacity:locked?0.4:1, pointerEvents:locked?"none":"auto" }}>
          {rarities.map(r=>(
            <button key={r} disabled={locked} onClick={()=>setFilter(r)} style={{
              padding:"6px 11px", borderRadius:7, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s",
              background:filter===r?(r==="all"?"rgba(0,200,255,0.15)":RARITY[r as Rarity].bg):"rgba(255,255,255,0.03)",
              color:filter===r?(r==="all"?"#00c8ff":RARITY[r as Rarity].color):"#8899bb",
              border:`1px solid ${filter===r?(r==="all"?"rgba(0,200,255,0.3)":RARITY[r as Rarity].border):"rgba(255,255,255,0.07)"}`,
            }}>{r==="all"?"전체":RARITY[r as Rarity].label}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:5, opacity:locked?0.4:1, pointerEvents:locked?"none":"auto" }}>
          {[{k:"power",l:"전투력"},{k:"name",l:"이름"}].map(({k,l})=>(
            <button key={k} disabled={locked} onClick={()=>setSort(k as typeof sort)} style={{
              padding:"6px 10px", borderRadius:7, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s",
              background:sort===k?"rgba(168,85,247,0.12)":"rgba(255,255,255,0.03)",
              color:sort===k?"#a855f7":"#8899bb",
              border:`1px solid ${sort===k?"rgba(168,85,247,0.3)":"rgba(255,255,255,0.07)"}`,
              display:"flex", alignItems:"center", gap:4,
            }}><ArrowUpDown size={10}/>{l}</button>
          ))}
          <div
            onMouseEnter={()=>setStatMenuOpen(true)}
            onMouseLeave={()=>setStatMenuOpen(false)}
            style={{ position:"relative" }}
          >
            <button disabled={locked} onClick={()=>setSort("stat")} style={{
              padding:"6px 10px", borderRadius:7, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s",
              background:sort==="stat"?"rgba(168,85,247,0.12)":"rgba(255,255,255,0.03)",
              color:sort==="stat"?"#a855f7":"#8899bb",
              border:`1px solid ${sort==="stat"?"rgba(168,85,247,0.3)":"rgba(255,255,255,0.07)"}`,
              display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap",
            }}><ArrowUpDown size={10}/>능력치{sort==="stat" && `: ${STATS.find(s=>s.key===sortStat)?.label}`}</button>
            {statMenuOpen && (
              <div style={{
                position:"absolute", top:"100%", left:0, paddingTop:4, zIndex:70,
                display:"flex", flexDirection:"column", minWidth:110,
              }}>
              <div style={{
                background:"#0e1526", border:"1px solid rgba(168,85,247,0.25)", borderRadius:9,
                boxShadow:"0 10px 30px rgba(0,0,0,0.5)", padding:4, display:"flex", flexDirection:"column",
              }}>
                {STATS.map(s=>(
                  <button key={s.key} onClick={()=>{setSort("stat");setSortStat(s.key);setStatMenuOpen(false);}} style={{
                    display:"flex", alignItems:"center", gap:6, padding:"6px 9px", borderRadius:6, fontSize:11, fontFamily:"'Noto Sans KR'",
                    background:sort==="stat"&&sortStat===s.key?"rgba(168,85,247,0.15)":"transparent",
                    color:sort==="stat"&&sortStat===s.key?"#a855f7":"#c7d2e6", border:"none", cursor:"pointer", textAlign:"left",
                  }}><s.Icon size={11} style={{color:s.color}}/>{s.label}</button>
                ))}
              </div>
              </div>
            )}
          </div>
          <button disabled={locked} onClick={()=>setSortDir(d=>d==="desc"?"asc":"desc")} title={sortDir==="desc"?"내림차순":"오름차순"} style={{
            padding:"6px 8px", borderRadius:7, cursor:"pointer", transition:"all 0.15s",
            background:"rgba(255,255,255,0.03)", color:"#8899bb", border:"1px solid rgba(255,255,255,0.07)",
            display:"flex", alignItems:"center",
          }}>
            {sortDir==="desc" ? <ArrowDownWideNarrow size={13}/> : <ArrowUpNarrowWide size={13}/>}
          </button>
        </div>
      </div>
      <p style={{ fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'", marginTop:0, marginBottom:20 }}>검색 결과: {filtered.length}명</p>

      {/* Grid */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:16 }}>
        {filtered.map(u=>(
          <GridCard key={u.id} user={u} onClick={()=>openCard(u)} locked={locked}/>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(4,7,14,0.82)", backdropFilter:"blur(8px)" }} onClick={()=>{setModalSummary(null);setModalDetail(null);}}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"relative" }}>
            <button onClick={()=>{setModalSummary(null);setModalDetail(null);}} style={{ position:"absolute", top:-42, right:0, width:32, height:32, borderRadius:999, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"#8899bb", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15}/></button>
            <FlipCard user={modal} w={300} h={460} locked={!(modal?.isUnlocked ?? false)} onUnlock={onEval} hexSize={255}/>
            <p style={{ textAlign:"center", marginTop:10, fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>카드를 클릭해 앞/뒤를 확인하세요</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Teams Screen ─────────────────────────────────────────────────────────────
function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const pad = (n:number)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function parseDeadlineParts(v: string): { year:string; month:string; day:string; hour:string; minute:string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  return m ? { year:m[1], month:m[2], day:m[3], hour:m[4], minute:m[5] } : { year:"", month:"", day:"", hour:"", minute:"" };
}

// 네이티브 <input type="datetime-local">는 오전/오후 표기를 브라우저·OS 로케일에 맡길 뿐
// 24시간제로 강제할 방법이 없고, 연도 4자리 입력 후 자동으로 월 칸으로 넘어가는 동작도
// 브라우저 내부 구현이라 통제가 안 된다. 그래서 연/월/일/시/분을 각각 우리가 직접 관리하는
// 숫자 칸으로 구현해 두 문제 모두를 프론트에서 직접 통제한다.
function DeadlineField({ value, onChange, error }: { value:string; onChange:(v:string)=>void; error?:string }) {
  const initial = parseDeadlineParts(value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  function emit(next: { year?:string; month?:string; day?:string; hour?:string; minute?:string }) {
    const y = next.year ?? year, mo = next.month ?? month, d = next.day ?? day, h = next.hour ?? hour, mi = next.minute ?? minute;
    if (y.length===4 && mo.length===2 && d.length===2 && h.length===2 && mi.length===2) onChange(`${y}-${mo}-${d}T${h}:${mi}`);
    else onChange("");
  }

  const digitsOnly = (v:string, maxLen:number) => v.replace(/[^0-9]/g,"").slice(0,maxLen);
  // 두 자리를 다 채우는 순간 유효 범위로 맞추고 다음 칸으로 넘어간다(연도는 4자리 채우면 바로 월로).
  const clamp2 = (digits:string, lo:number, hi:number) => digits.length<2 ? digits : String(Math.min(Math.max(parseInt(digits,10)||0, lo), hi)).padStart(2,"0");

  function handleYear(v:string) {
    const digits = digitsOnly(v,4);
    setYear(digits); emit({year:digits});
    if (digits.length===4) monthRef.current?.focus();
  }
  function handleMonth(v:string) {
    const digits = clamp2(digitsOnly(v,2),1,12);
    setMonth(digits); emit({month:digits});
    if (digits.length===2) dayRef.current?.focus();
  }
  function handleDay(v:string) {
    const digits = clamp2(digitsOnly(v,2),1,31);
    setDay(digits); emit({day:digits});
    if (digits.length===2) hourRef.current?.focus();
  }
  function handleHour(v:string) {
    const digits = clamp2(digitsOnly(v,2),0,23);
    setHour(digits); emit({hour:digits});
    if (digits.length===2) minuteRef.current?.focus();
  }
  function handleMinute(v:string) {
    const digits = clamp2(digitsOnly(v,2),0,59);
    setMinute(digits); emit({minute:digits});
  }
  function backspaceTo(ref: React.RefObject<HTMLInputElement>, current:string) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key==="Backspace" && current==="") ref.current?.focus(); };
  }

  const segStyle: React.CSSProperties = { ...DS.input, padding:"11px 0", textAlign:"center", fontSize:14, fontFamily:"'Orbitron',monospace", boxSizing:"border-box" };
  const sep = (ch:string) => <span style={{ color:"#4a5a7a", fontSize:14 }}>{ch}</span>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>프로젝트 마감기한 <span style={{color:"#4a5a7a"}}>(24시간 형식)</span></span>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <input ref={yearRef} value={year} onChange={e=>handleYear(e.target.value)} placeholder="YYYY" inputMode="numeric" style={{ ...segStyle, width:60 }}/>
        {sep("-")}
        <input ref={monthRef} value={month} onChange={e=>handleMonth(e.target.value)} onKeyDown={backspaceTo(yearRef,month)} placeholder="MM" inputMode="numeric" style={{ ...segStyle, width:38 }}/>
        {sep("-")}
        <input ref={dayRef} value={day} onChange={e=>handleDay(e.target.value)} onKeyDown={backspaceTo(monthRef,day)} placeholder="DD" inputMode="numeric" style={{ ...segStyle, width:38 }}/>
        <span style={{ width:6 }}/>
        <input ref={hourRef} value={hour} onChange={e=>handleHour(e.target.value)} onKeyDown={backspaceTo(dayRef,hour)} placeholder="HH" inputMode="numeric" style={{ ...segStyle, width:38 }}/>
        {sep(":")}
        <input ref={minuteRef} value={minute} onChange={e=>handleMinute(e.target.value)} onKeyDown={backspaceTo(hourRef,minute)} placeholder="mm" inputMode="numeric" style={{ ...segStyle, width:38 }}/>
      </div>
      {error && <span style={{ fontSize:11, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{error}</span>}
    </div>
  );
}

function TeamsScreen() {
  const [tab, setTab] = useState<"list"|"create"|"join">("list");
  const [myTeams, setMyTeams] = useState<TeamDetailDto[]|null>(null);
  const [rarityMap, setRarityMap] = useState<Record<number, Rarity|null>>({});
  const [evalTargets, setEvalTargets] = useState<EvaluationTargetDto[]>([]);
  const [tname, setTname] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const [deadlineFieldKey, setDeadlineFieldKey] = useState(0);
  const [code, setCode] = useState("");
  const [created, setCreated] = useState<string|null>(null);
  const [copiedKey, setCopiedKey] = useState<string|null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadTeams() {
    try {
      const [summaries, cards, targets] = await Promise.all([
        listMyTeams(), listCards(), listEvaluationTargets().catch(()=>[] as EvaluationTargetDto[]),
      ]);
      const details = await Promise.all(summaries.map(t=>getTeam(t.id)));
      setMyTeams(details);
      setRarityMap(Object.fromEntries(cards.map(c=>[c.userId, rarityFromCardStats(c.stats)])));
      setEvalTargets(targets);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "팀 목록을 불러오지 못했습니다.");
    }
  }
  useEffect(()=>{ loadTeams(); },[]);

  function teamStatus(team: TeamSummaryDto): "done"|"pending" {
    if (new Date(team.projectDeadline).getTime() > Date.now()) return "pending";
    const mine = evalTargets.filter(t=>t.teamId===team.id);
    return (mine.length===0 || mine.every(t=>t.alreadyEvaluated)) ? "done" : "pending";
  }

  async function create() {
    if (!tname) return;
    const deadlineMs = new Date(deadline).getTime();
    if (!deadline || isNaN(deadlineMs) || deadlineMs <= Date.now()) {
      setDeadlineError("유효한 기한을 입력해주세요.");
      return;
    }
    setDeadlineError(""); setError(""); setBusy(true);
    try {
      const team = await createTeam(tname, new Date(deadline).toISOString());
      setCreated(team.inviteCode);
      setTname(""); setDeadline(""); setDeadlineFieldKey(k=>k+1);
      loadTeams();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "팀 생성 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function join() {
    setError(""); setBusy(true);
    try {
      await joinTeam(code);
      setCode(""); setTab("list");
      loadTeams();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "팀 참여 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function copy(key:string, text:string) {
    const ok = await copyToClipboard(text);
    if (!ok) { setError("클립보드 복사에 실패했습니다."); return; }
    setCopiedKey(key);
    setTimeout(()=>setCopiedKey(k=>k===key?null:k), 2000);
  }

  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:20 }}>팀 관리</h1>
      {error && <p style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'", marginBottom:14 }}>{error}</p>}
      <div style={{ display:"flex", gap:6, marginBottom:24 }}>
        {[{k:"list",l:"내 팀",Icon:Users},{k:"create",l:"팀 만들기",Icon:Plus},{k:"join",l:"팀 참여",Icon:UserPlus}].map(({k,l,Icon})=>(
          <Btn key={k} variant={tab===k?"secondary":"ghost"} onClick={()=>{setTab(k as typeof tab);setCreated(null);}} icon={<Icon size={13}/>}>{l}</Btn>
        ))}
      </div>
      {tab==="list" && (
        myTeams===null ? (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}><RefreshCw size={16} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:13 }}>팀 목록을 불러오는 중...</span></div>
        ) : myTeams.length===0 ? (
          <p style={{ fontSize:13, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>아직 소속된 팀이 없습니다. 팀을 만들거나 초대 코드로 참여해보세요.</p>
        ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {myTeams.map(({team, members})=>{
            const status = teamStatus(team);
            const teamKey = String(team.id);
            return (
            <div key={team.id} style={{ ...DS.card, padding:"18px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0" }}>{team.name}</div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                  <Pill label={status==="done"?"완료됨":"진행 중"} color={status==="done"?"#34d399":"#00c8ff"} small/>
                  <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#8899bb", fontFamily:"'Orbitron',monospace" }}>
                    <Hash size={9}/>{team.inviteCode}
                    <button onClick={()=>copy(teamKey,team.inviteCode)} title="초대 코드 복사" style={{ background:"none", border:"none", color:copiedKey===teamKey?"#34d399":"#8899bb", cursor:"pointer", padding:2, display:"flex", alignItems:"center" }}>
                      {copiedKey===teamKey ? <Check size={11}/> : <Copy size={11}/>}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:2 }}>멤버 {team.memberCount}명</div>
              <div style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:14 }}>마감 {formatDeadline(team.projectDeadline)}</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {members.map(m=>{
                  const rarity = rarityMap[m.userId];
                  const borderColor = rarity ? RARITY[rarity].color : "#4a5a7a";
                  return (
                    <div key={m.userId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{ width:38, height:38, borderRadius:999, overflow:"hidden", border:`2px solid ${borderColor}` }}>
                        <img src={m.profileImageUrl || FALLBACK_AVATAR} alt={m.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      </div>
                      <span style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{m.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
        )
      )}
      {tab==="create" && (
        <div style={{ ...DS.card, padding:"24px", maxWidth:420 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="팀 이름" value={tname} onChange={setTname} placeholder="예) 감마팀"/>
            <DeadlineField key={deadlineFieldKey} value={deadline} onChange={v=>{setDeadline(v);setDeadlineError("");}} error={deadlineError||undefined}/>
            <Btn icon={<Plus size={13}/>} onClick={create} disabled={busy}>{busy?"생성 중...":"팀 생성"}</Btn>
            {created && (
              <div style={{ padding:"16px", borderRadius:10, background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.25)" }}>
                <p style={{ fontSize:12, color:"#34d399", fontFamily:"'Noto Sans KR'", marginBottom:8 }}>✓ 팀이 생성되었습니다! 초대 코드를 공유하세요.</p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:24, fontFamily:"'Orbitron',monospace", color:"#34d399", fontWeight:700, letterSpacing:"0.15em" }}>{created}</span>
                  <button onClick={()=>copy("created",created)} style={{ padding:"6px 12px", borderRadius:8, background:"rgba(52,211,153,0.15)", color:"#34d399", border:"1px solid rgba(52,211,153,0.3)", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans KR'", display:"flex", alignItems:"center", gap:5 }}>
                    {copiedKey==="created"?<Check size={12}/>:<Copy size={12}/>}{copiedKey==="created"?"복사됨":"복사"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {tab==="join" && (
        <div style={{ ...DS.card, padding:"24px", maxWidth:420 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <p style={{ fontSize:13, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>팀장에게 받은 초대 코드를 입력하세요.</p>
            <div style={{ ...DS.input, display:"flex", alignItems:"center", overflow:"hidden" }}>
              <Hash size={14} style={{color:"#8899bb",marginLeft:12,flexShrink:0}}/>
              <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="######" style={{ background:"none", border:"none", outline:"none", padding:"11px 10px", color:"#00c8ff", fontSize:18, fontFamily:"'Orbitron',monospace", letterSpacing:"0.18em", flex:1 }}/>
            </div>
            <Btn full variant="purple" disabled={code.length<5||busy} onClick={join} icon={<UserPlus size={13}/>}>{busy?"참여 중...":"팀 참여하기"}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Evaluate Screen ──────────────────────────────────────────────────────────
function EvaluateScreen({ onDone }: { onDone:()=>void }) {
  const [teammates, setTeammates] = useState<EvaluationTargetDto[]|null>(null);
  const [titleOptions, setTitleOptions] = useState<TitleDto[]|null>(null);
  const [error, setError] = useState("");
  const [ratings, setRatings] = useState<Record<number,Partial<Stats>>>({});
  const [titles, setTitles] = useState<Record<number,number>>({});
  const [done, setDone] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState<number|null>(null);

  useEffect(()=>{
    (async () => {
      try {
        const [targets, titleList] = await Promise.all([listEvaluationTargets(), listTitles()]);
        setTeammates(targets);
        setTitleOptions(titleList);
        setRatings(Object.fromEntries(targets.map(t=>[t.userId,{attack:5,defense:5,agility:5,teamwork:5,health:5,mana:5}])));
        setDone(targets.filter(t=>t.alreadyEvaluated).map(t=>t.userId));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "평가 대상자를 불러오지 못했습니다.");
      }
    })();
  },[]);

  const teamName = teammates && teammates.length>0
    ? Array.from(new Set(teammates.map(t=>t.teamName))).join(", ")
    : "";

  function setR(uid:number,key:string,v:number){setRatings(p=>({...p,[uid]:{...p[uid],[key]:v}}))}
  // 초기 능력치 설정과 동일한 규칙(백엔드 SubmitEvaluationRequest.isTotalWithinRange()): 총합 6~40.
  function statsSum(r: Partial<Stats>|undefined): number {
    return STATS.reduce((sum,s)=>sum+((r?.[s.key as keyof Stats])??5),0);
  }

  async function submit(uid:number) {
    const titleId = titles[uid];
    const target = teammates?.find(t=>t.userId===uid);
    if (!titleId || !target) return;
    const r = ratings[uid] ?? {};
    const sum = statsSum(r);
    if (sum<6 || sum>40) { setError("능력치 총합을 6-40 사이로 설정해주세요."); return; }
    setSubmitting(uid); setError("");
    try {
      await submitEvaluation({
        teamId: target.teamId,
        targetUserId: uid,
        attack: r.attack??5, defense: r.defense??5, agility: r.agility??5,
        teamwork: r.teamwork??5, mana: r.mana??5, health: r.health??5,
        titleIds: [titleId],
      });
      const nextDone = [...done, uid];
      setDone(nextDone);
      if (teammates && nextDone.length===teammates.length) setTimeout(onDone,600);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "평가 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(null);
    }
  }

  if (teammates===null) {
    return (
      <div style={{ padding:"28px 32px" }}>
        {error
          ? <p style={{ fontSize:13, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{error}</p>
          : <div style={{ display:"flex", alignItems:"center", gap:8 }}><RefreshCw size={16} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:13 }}>평가 대상자를 불러오는 중...</span></div>}
      </div>
    );
  }
  if (teammates.length===0) {
    return <div style={{ padding:"28px 32px" }}><p style={{ fontSize:13, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>평가할 팀원이 없습니다. 먼저 팀에 참여해주세요.</p></div>;
  }

  const progress = Math.round((done.length/teammates.length)*100);

  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:4 }}>팀원 평가</h1>
        <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:12 }}>{teamName} — 프로젝트 종료 후 평가</p>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1 }}><Progress value={progress} color={progress===100?"#34d399":"#00c8ff"}/></div>
          <span style={{ fontSize:12, fontFamily:"'Orbitron',monospace", color:progress===100?"#34d399":"#00c8ff", fontWeight:700 }}>{done.length}/{teammates.length}</span>
        </div>
      </div>
      {error && <p style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'", marginBottom:14 }}>{error}</p>}
      {progress===100 && (
        <div style={{ padding:"14px 18px", borderRadius:10, background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.3)", marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
          <CheckCircle2 size={18} style={{color:"#34d399"}}/>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:"#34d399", fontFamily:"'Noto Sans KR'" }}>모든 평가를 완료했습니다!</p>
            <p style={{ fontSize:11, color:"#34d399", fontFamily:"'Noto Sans KR'", opacity:0.7 }}>이제 모든 카드의 상세 정보를 확인할 수 있습니다.</p>
          </div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {teammates.map(u=>{
          const isDone=done.includes(u.userId);
          const uRatings = ratings[u.userId];
          const sum = statsSum(uRatings);
          const sumValid = sum>=6 && sum<=40;
          return (
            <div key={u.userId} style={{ ...DS.card, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", background:isDone?"rgba(52,211,153,0.04)":"rgba(255,255,255,0.01)", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:999, overflow:"hidden", border:"2px solid #00c8ff", flexShrink:0 }}><img src={u.profileImageUrl || FALLBACK_AVATAR} alt={u.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#00c8ff" }}>{u.name}</div>
                </div>
                {isDone && <Pill label="✓ 완료" color="#34d399" small/>}
              </div>
              {!isDone && (
                <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}>
                  <div>
                    <p style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:8 }}>칭호 선택 <span style={{color:"#4a5a7a"}}>(1개 선택)</span></p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {(titleOptions??[]).map(t=>{
                        const sel=titles[u.userId]===t.id;
                        return <button key={t.id} onClick={()=>setTitles(p=>({...p,[u.userId]:t.id}))} style={{ padding:"4px 10px", borderRadius:999, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s", background:sel?"rgba(0,200,255,0.15)":"rgba(255,255,255,0.03)", color:sel?"#00c8ff":"#8899bb", border:`1px solid ${sel?"rgba(0,200,255,0.4)":"rgba(255,255,255,0.07)"}` }}>{t.name}</button>;
                      })}
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 24px" }}>
                    {STATS.map(s=>(
                      <StatSlider key={s.key} label={s.label} desc={s.desc} value={(ratings[u.userId]?.[s.key as keyof Stats]??5) as number} onChange={v=>setR(u.userId,s.key,v)} color={s.color} Icon={s.Icon}/>
                    ))}
                  </div>
                  <div style={{ padding:"12px", borderRadius:10, background:"rgba(0,200,255,0.04)", border:"1px solid rgba(0,200,255,0.1)", position:"relative" }}>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      <MiniHex stats={Object.fromEntries(STATS.map(s=>[s.key,((uRatings?.[s.key as keyof Stats])??5)*10])) as unknown as Stats} size={90} color="#00c8ff"/>
                    </div>
                    <span style={{ position:"absolute", left:14, bottom:12, fontSize:18, fontFamily:"'Orbitron',monospace", fontWeight:800, color: sumValid?"#00c8ff":"#ef4444" }}>{sum}</span>
                  </div>
                  {!sumValid && <span style={{ fontSize:11, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>능력치 총합을 6-40 사이로 설정해주세요.</span>}
                  <div style={{ display:"flex", justifyContent:"flex-end" }}>
                    <Btn disabled={!titles[u.userId]||submitting===u.userId||!sumValid} onClick={()=>submit(u.userId)} icon={<Check size={13}/>}>{submitting===u.userId?"제출 중...":"평가 제출"}</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Analysis Screen ───────────────────────────────────────────────────────
function AIScreen() {
  const [cards, setCards] = useState<User[]|null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [sessionId, setSessionId] = useState<number|null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ role:"ai", text:"안녕하세요! 선택된 카드를 기반으로 팀원 분석을 도와드립니다. 아래 예시 질문을 선택하거나 직접 입력해보세요." }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [displayIdx, setDisplayIdx] = useState<number>(-1);
  const [displayText, setDisplayText] = useState("");
  const msgEnd = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    listCards().then(list=>{
      const mapped = list.map(cardToUser);
      setCards(mapped);
      if (mapped[0]) setSelected([mapped[0].id]);
    }).catch(e=>setError(e instanceof ApiError ? e.message : "카드 목록을 불러오지 못했습니다."));
  },[]);

  // 선택된 카드 조합이 바뀌면 새 대화 세션에서 다시 시작한다.
  useEffect(()=>{ setSessionId(null); },[selected.join(",")]);

  const selUsers = (cards??[]).filter(u=>selected.includes(u.id));
  const locked = deriveEvaluationLocked(cards);

  function toggleSel(id:number){setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  async function send(q:string){
    if(locked||!q.trim()||selected.length===0) return;
    const newMsgs=[...msgs,{role:"user" as const,text:q}];
    setMsgs(newMsgs); setInput(""); setTyping(true); setError("");
    try {
      let sid = sessionId;
      if (sid===null) {
        const session = await createChatSession(selected);
        sid = session.id;
        setSessionId(sid);
      }
      const reply = await sendChatMessage(sid, q);
      setMsgs(m=>[...m,{role:"ai",text:reply.content}]);
      setDisplayIdx(newMsgs.length); setDisplayText("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "AI 응답을 가져오지 못했습니다.");
      setMsgs(m=>[...m,{role:"ai",text:"죄송해요, 지금은 답변을 가져올 수 없어요. 잠시 후 다시 시도해주세요."}]);
    } finally {
      setTyping(false);
    }
  }

  useEffect(()=>{ msgEnd.current?.scrollIntoView({behavior:"smooth"}); },[msgs,typing]);

  useEffect(()=>{
    if(displayIdx<0) return;
    const target=msgs[displayIdx]; if(!target||target.role!=="ai") return;
    let i=0;
    setDisplayText("");
    const iv=setInterval(()=>{ i++; setDisplayText(target.text.slice(0,i)); if(i>=target.text.length){clearInterval(iv);setDisplayIdx(-1);} },14);
    return ()=>clearInterval(iv);
  },[displayIdx]);

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      {/* Left panel */}
      <div style={{ width:220, borderRight:"1px solid rgba(255,255,255,0.06)", padding:"18px 14px", display:"flex", flexDirection:"column", gap:10, overflowY:"auto" }}>
        <p style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:4 }}>분석할 카드 선택</p>
        {cards===null ? (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><RefreshCw size={13} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:11 }}>불러오는 중...</span></div>
        ) : cards.map(u=>{
          const r=RARITY[u.rarity]; const sel=selected.includes(u.id);
          return (
            <div key={u.id} onClick={()=>toggleSel(u.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:9, cursor:"pointer", background:sel?r.bg:"rgba(255,255,255,0.02)", border:`1px solid ${sel?r.border:"rgba(255,255,255,0.06)"}`, transition:"all 0.15s" }}>
              <div style={{ width:28, height:28, borderRadius:999, overflow:"hidden", border:`1.5px solid ${sel?r.color:"transparent"}`, flexShrink:0 }}><img src={u.photo} alt={u.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, fontFamily:"'Noto Sans KR'", color:sel?r.color:"#dde5f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name}</div>
              </div>
              {sel && <Check size={11} style={{color:r.color,flexShrink:0}}/>}
            </div>
          );
        })}
      </div>
      {/* Chat panel */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}><Bot size={14} style={{color:"#a855f7"}}/></div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0" }}>AI 팀 분석</div>
            <div style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{selUsers.length}명 선택됨</div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          {msgs.map((m,i)=>{
            const isLast=i===msgs.length-1; const isUser=m.role==="user";
            const text=(isLast&&i===displayIdx)?displayText:m.text;
            return (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:9, flexDirection:isUser?"row-reverse":"row" }}>
                {!isUser && <div style={{ width:28, height:28, borderRadius:8, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}><Bot size={12} style={{color:"#a855f7"}}/></div>}
                <div style={{ maxWidth:"72%", padding:"10px 14px", borderRadius:12, fontSize:13, fontFamily:"'Noto Sans KR'", lineHeight:1.65, whiteSpace:"pre-line", background:isUser?"rgba(0,200,255,0.12)":"rgba(255,255,255,0.04)", color:isUser?"#00c8ff":"#dde5f0", border:`1px solid ${isUser?"rgba(0,200,255,0.25)":"rgba(255,255,255,0.06)"}` }}>
                  {text}
                </div>
              </div>
            );
          })}
          {typing && (
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Bot size={12} style={{color:"#a855f7"}}/></div>
              <div style={{ padding:"10px 14px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)", display:"flex", gap:4 }}>
                {[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:999, background:"#8899bb", animation:`bounce 1s ${i*0.2}s infinite` }}/>)}
              </div>
            </div>
          )}
          <div ref={msgEnd}/>
        </div>
        {error && <p style={{ fontSize:11, color:"#ef4444", fontFamily:"'Noto Sans KR'", padding:"0 20px" }}>{error}</p>}
        {/* Example Qs */}
        <div style={{ padding:"8px 20px 0", display:"flex", flexWrap:"wrap", gap:5, opacity:locked?0.4:1, pointerEvents:locked?"none":"auto" }}>
          {AI_QUESTIONS.map(q=>(
            <button key={q} disabled={locked} onClick={()=>send(q)} style={{ padding:"5px 11px", borderRadius:999, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", background:"rgba(168,85,247,0.08)", color:"#a855f7", border:"1px solid rgba(168,85,247,0.2)", transition:"all 0.15s" }}>{q}</button>
          ))}
        </div>
        {/* Input */}
        <div style={{ padding:"12px 20px 20px", display:"flex", gap:8 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} disabled={locked} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder={locked?"평가를 완료하세요":"질문을 입력하세요"} style={{ ...DS.input, flex:1, padding:"11px 14px", fontSize:13, opacity:locked?0.6:1, cursor:locked?"not-allowed":"text" }}/>
          <button onClick={()=>send(input)} disabled={locked||!input.trim()||typing} style={{ width:42, height:42, borderRadius:10, background:!locked&&input.trim()&&!typing?"linear-gradient(135deg,#00c8ff,#0080b0)":"rgba(255,255,255,0.05)", color:!locked&&input.trim()&&!typing?"#060c18":"#4a5a7a", border:"none", cursor:!locked&&input.trim()&&!typing?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Send size={16}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Compare Screen ───────────────────────────────────────────────────────────
function CompareScreen() {
  const [cards, setCards] = useState<User[]|null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const colors = ["#00c8ff","#a855f7","#fbbf24"];
  function toggle(id:number){ if(locked) return; setSelected(p=>p.includes(id)?p.filter(x=>x!==id):p.length<3?[...p,id]:p);}

  useEffect(()=>{
    listCards()
      .then(list=>setCards(list.map(cardToUser)))
      .catch(e=>setError(e instanceof ApiError ? e.message : "카드 목록을 불러오지 못했습니다."));
  },[]);

  const locked = deriveEvaluationLocked(cards);
  const selUsers = (cards??[]).filter(u=>selected.includes(u.id));

  if (error) return <div style={{ padding:"28px 32px" }}><p style={{ color:"#ef4444", fontFamily:"'Noto Sans KR'", fontSize:13 }}>{error}</p></div>;
  if (!cards) return <div style={{ padding:"28px 32px", display:"flex", alignItems:"center", gap:8 }}><RefreshCw size={16} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:13 }}>카드를 불러오는 중...</span></div>;

  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:20 }}>카드 비교</h1>
      {/* User selector */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:20 }}>
        {cards.map(u=>{
          const r=RARITY[u.rarity]; const sel=selected.includes(u.id);
          const ci=selected.indexOf(u.id);
          return (
            <button key={u.id} disabled={locked} onClick={()=>toggle(u.id)} style={{
              display:"flex", alignItems:"center", gap:7, padding:"7px 12px", borderRadius:9,
              cursor:locked?"not-allowed":"pointer",
              background:locked?"rgba(255,255,255,0.03)":(sel?r.bg:"rgba(255,255,255,0.03)"),
              border:`1.5px solid ${locked?"rgba(255,255,255,0.07)":(sel?(colors[ci]??r.color):"rgba(255,255,255,0.07)")}`,
              opacity:locked?0.4:1, transition:"all 0.15s",
            }}>
              <div style={{ width:22, height:22, borderRadius:999, overflow:"hidden", border:`1.5px solid ${!locked&&sel?(colors[ci]??r.color):"transparent"}` }}><img src={u.photo} alt={u.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
              <span style={{ fontSize:12, fontWeight:700, fontFamily:"'Noto Sans KR'", color:locked?"#8899bb":(sel?(colors[ci]??r.color):"#8899bb") }}>{u.name}</span>
              {!locked && sel && <div style={{ width:8, height:8, borderRadius:999, background:colors[ci]??r.color }}/>}
            </button>
          );
        })}
      </div>

      {selUsers.length>=2 ? (
        <>
          {/* VS Cards */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", marginBottom:24 }}>
            {selUsers.map((u,i)=>(
              <div key={u.id} style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <FlipCard user={u} w={160} h={250} flippable={false}/>
                  <div style={{ width:10, height:10, borderRadius:999, background:colors[i] }}/>
                </div>
                {i<selUsers.length-1 && <div style={{ fontSize:24, fontWeight:900, fontFamily:"'Orbitron',monospace", color:"rgba(255,255,255,0.15)" }}>VS</div>}
              </div>
            ))}
          </div>
          {/* Radar comparison */}
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:12 }}>능력치 비교</h3>
            <BigHex users={selUsers} size={280} colors={colors}/>
            {/* Stat table */}
            <div style={{ marginTop:16, overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'Noto Sans KR'" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:"left", padding:"6px 8px", color:"#4a5a7a", fontWeight:400 }}>능력치</th>
                    {selUsers.map((u,i)=><th key={u.id} style={{ textAlign:"center", padding:"6px 8px", color:colors[i], fontWeight:700, fontFamily:"'Noto Sans KR'" }}>{u.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {STATS.map(s=>{
                    const vals=selUsers.map(u=>u.stats[s.key as keyof Stats]);
                    const mx=Math.max(...vals);
                    return (
                      <tr key={s.key} style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding:"8px" }}>
                          <InfoTooltip text={s.desc} placement="top">
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <s.Icon size={11} style={{color:s.color}}/><span style={{color:"#8899bb"}}>{s.label}</span>
                            </div>
                          </InfoTooltip>
                        </td>
                        {vals.map((v,i)=><td key={i} style={{ textAlign:"center", padding:"8px", color:v===mx?colors[i]:"#8899bb", fontFamily:"'Orbitron',monospace", fontWeight:v===mx?700:400 }}>{v}{v===mx?" ★":""}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", borderRadius:14, border:"1px dashed rgba(0,200,255,0.15)" }}>
          <BarChart2 size={36} style={{color:"#2a3a55"}}/>
          <p style={{ fontSize:13, color:"#4a5a7a", fontFamily:"'Noto Sans KR'", marginTop:12 }}>{locked ? "평가를 완료하세요" : "비교할 카드를 2~3장 선택해주세요"}</p>
        </div>
      )}
    </div>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfileDto|null>(null);
  const [card, setCard] = useState<User|null>(null);
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    (async () => {
      try {
        const me = await getMyProfile();
        setProfile(me);
        setBio(me.biography ?? "");
        const detail = await getCard(me.id);
        const built = cardToUser(detail);
        // 내 프로필은 (다른 사람 카드와 달리) 평가 완료 여부와 무관하게 항상 볼 수 있어야 하므로,
        // 도감 잠금으로 stats가 null로 내려온 경우 /users/me가 주는 내 실제 능력치로 대체한다.
        const myStats = me.stats ? dtoStatsToStats(me.stats) : ZERO_STATS;
        setCard(detail.isUnlocked ? built : { ...built, stats: myStats, rarity: me.stats ? rarityFromPower(totalPower(myStats)) : "common" });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "프로필을 불러오지 못했습니다.");
      }
    })();
  },[]);

  async function save() {
    setSaving(true); setError("");
    try {
      await apiUpdateProfile({ biography: bio });
      setSaved(true); setTimeout(()=>setSaved(false),2000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoSelected(file: File) {
    const invalid = validateProfileImage(file);
    if (invalid) { setPhotoError(invalid); return; }
    setPhotoError(""); setPhotoUploading(true);
    try {
      const updated = await apiUploadProfileImage(file);
      setProfile(updated);
      setCard(c => c ? { ...c, photo: updated.profileImageUrl || FALLBACK_AVATAR } : c);
    } catch (e) {
      setPhotoError(e instanceof ApiError ? e.message : "사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setPhotoUploading(false);
    }
  }

  if (error) return <div style={{ padding:"28px 32px" }}><p style={{ color:"#ef4444", fontFamily:"'Noto Sans KR'", fontSize:13 }}>{error}</p></div>;
  if (!profile || !card) return <div style={{ padding:"28px 32px", display:"flex", alignItems:"center", gap:8 }}><RefreshCw size={16} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:13 }}>프로필을 불러오는 중...</span></div>;

  const u = card; const r = RARITY[u.rarity];
  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:24 }}>내 프로필</h1>
      <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
        {/* Left: card preview */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, alignItems:"flex-start" }}>
          <p style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>내 카드 미리보기</p>
          <FlipCard user={u} w={220} h={340}/>
          <p style={{ fontSize:10, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>클릭하여 앞/뒤 확인</p>
        </div>
        {/* Right: edit */}
        <div style={{ flex:1, minWidth:280, display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:14 }}>프로필 수정</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Photo */}
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display:"none" }}
                  onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoSelected(f); e.target.value=""; }}/>
                <div style={{ width:56, height:56, borderRadius:999, overflow:"hidden", border:`2px solid ${r.color}`, flexShrink:0 }}><img src={u.photo} alt={u.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
                <Btn variant="ghost" size="sm" disabled={photoUploading} onClick={()=>fileInputRef.current?.click()} icon={photoUploading?<RefreshCw size={12} style={{animation:"spin 1s linear infinite"}}/>:<Upload size={12}/>}>{photoUploading?"업로드 중...":"사진 변경"}</Btn>
              </div>
              {photoError && <span style={{ fontSize:11, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{photoError}</span>}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>한줄 자기소개</span>
                  <span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:bio.length>45?"#ef4444":"#4a5a7a" }}>{bio.length}/50</span>
                </div>
                <textarea value={bio} onChange={e=>e.target.value.length<=50&&setBio(e.target.value)} rows={2} style={{ ...DS.input, width:"100%", padding:"10px 12px", resize:"none", fontFamily:"'Noto Sans KR'", fontSize:13, lineHeight:1.6, boxSizing:"border-box" }}/>
              </div>
              <Btn icon={saved?<CheckCircle2 size={13}/>:undefined} variant={saved?"ghost":"primary"} onClick={save} disabled={saving}>{saving?"저장 중...":saved?"저장됨":"저장하기"}</Btn>
            </div>
          </div>
          {/* Stats overview */}
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:12 }}>초기 능력치</h3>
            <BigHex stats={u.stats} size={220}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px", marginTop:8 }}>
              {STATS.map(s=>(
                <div key={s.key} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <InfoTooltip text={s.desc} placement="top">
                    <div style={{ display:"flex", alignItems:"center", gap:6, userSelect:"none" }}>
                      <s.Icon size={11} style={{color:s.color}}/>
                      <span style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{s.label}</span>
                    </div>
                  </InfoTooltip>
                  <span style={{ marginLeft:"auto", fontSize:12, fontFamily:"'Orbitron',monospace", color:s.color, fontWeight:700 }}>{u.stats[s.key as keyof Stats]}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Titles */}
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:12 }}>받은 칭호</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {u.titleVotes.map(tv=>(
                <div key={tv.title} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:"#dde5f0", fontFamily:"'Noto Sans KR'" }}>{tv.title}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:80, height:4, background:"rgba(255,255,255,0.08)", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ width:`${(tv.votes/10)*100}%`, height:"100%", background:r.color, borderRadius:2 }}/>
                    </div>
                    <span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:r.color, fontWeight:700, width:20, textAlign:"right" }}>{tv.votes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 화면 하나가 예기치 못한 렌더링 오류(예: 백엔드 응답 모양이 프론트 가정과 달라 발생하는
// 타입 오류)로 죽어도 앱 전체가 새까맣게 사라지는 대신 해당 화면에만 안내 문구가 뜨게 한다.
class ScreenErrorBoundary extends Component<{ children: ReactNode }, { error: Error|null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:"28px 32px", display:"flex", flexDirection:"column", gap:6 }}>
          <p style={{ fontSize:14, fontWeight:700, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>화면을 표시하는 중 문제가 발생했습니다.</p>
          <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>다른 메뉴를 눌렀다가 다시 돌아오거나, 새로고침해주세요.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function GlobalStyle() {
  return (
    <style>{`
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      input[type=range]{height:4px;cursor:pointer}
      input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:rgba(255,255,255,0.1)}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;margin-top:-5px}
      ::-webkit-scrollbar{width:3px;height:3px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:rgba(0,200,255,0.2);border-radius:2px}
      textarea{font-family:'Noto Sans KR',sans-serif!important}
    `}</style>
  );
}

export default function App() {
  const [authPhase, setAuthPhase] = useState<AuthPhase>("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState<MainScreen>("pokedex");
  const [checkingSession, setCheckingSession] = useState(true);

  // 저장된 토큰이 있으면 새로고침해도 로그인 상태/온보딩 단계를 복원한다.
  useEffect(() => {
    if (!getAccessToken()) { setCheckingSession(false); return; }
    getMyProfile()
      .then(profile => {
        if (!profile.passwordChanged) setAuthPhase("change-password");
        else if (!profile.onboarded) setAuthPhase("profile-setup");
        else setIsLoggedIn(true);
      })
      .catch(e => {
        // 비밀번호 미변경 사용자는 /users/me 자체가 403(PASSWORD_CHANGE_REQUIRED)으로 막혀있다.
        if (e instanceof ApiError && e.errorCode === "PASSWORD_CHANGE_REQUIRED") setAuthPhase("change-password");
      })
      .finally(() => setCheckingSession(false));
  }, []);

  function handleLoginSuccess(passwordChanged: boolean) {
    if (!passwordChanged) { setAuthPhase("change-password"); return; }
    setCheckingSession(true);
    getMyProfile()
      .then(profile => { if (profile.onboarded) setIsLoggedIn(true); else setAuthPhase("profile-setup"); })
      .catch(() => setAuthPhase("profile-setup"))
      .finally(() => setCheckingSession(false));
  }
  function handlePasswordChanged() { setAuthPhase("profile-setup"); }
  function handleProfileDone() { setIsLoggedIn(true); }
  function handleLogout() { clearTokens(); setIsLoggedIn(false); setAuthPhase("login"); setScreen("pokedex"); }

  if (checkingSession) {
    return (
      <>
        <GlobalStyle/>
        <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#070b12" }}>
          <RefreshCw size={24} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/>
        </div>
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <GlobalStyle/>
        {authPhase==="login" && <LoginScreen onLoginSuccess={handleLoginSuccess}/>}
        {authPhase==="change-password" && <ChangePasswordScreen onDone={handlePasswordChanged}/>}
        {authPhase==="profile-setup" && <ProfileSetupScreen onDone={handleProfileDone}/>}
      </>
    );
  }

  return (
    <>
      <GlobalStyle/>
      <div style={{ display:"flex", height:"100vh", background:"#070b12", overflow:"hidden" }}>
        <Sidebar screen={screen} setScreen={s=>{setScreen(s);}} onLogout={handleLogout}/>
        <main style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <ScreenErrorBoundary key={screen}>
            {screen==="pokedex"     && <PokedexScreen onEval={()=>setScreen("evaluate")}/>}
            {screen==="teams"       && <TeamsScreen/>}
            {screen==="evaluate"    && <EvaluateScreen onDone={()=>setScreen("pokedex")}/>}
            {screen==="ai-analysis" && <AIScreen/>}
            {screen==="compare"     && <CompareScreen/>}
            {screen==="profile"     && <ProfileScreen/>}
          </ScreenErrorBoundary>
        </main>
      </div>
    </>
  );
}
