import { useState, useEffect, useRef, useMemo } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend } from "recharts";
import {
  Lock, Eye, EyeOff, Search, X, Plus, Copy, Trophy, UserPlus, Check,
  Sparkles, Hash, Camera, Users, Star, Send, BarChart2, ChevronRight,
  User, LogOut, BookOpen, Swords, Shield, Zap, MessageCircle, Heart,
  Lightbulb, CheckCircle2, Bot, SlidersHorizontal, ArrowUpDown,
  ChevronLeft, RefreshCw, Upload, AlertTriangle, Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Rarity = "common" | "rare" | "epic" | "legendary";
type AuthPhase = "login" | "change-password" | "profile-setup";
type MainScreen = "pokedex" | "teams" | "evaluate" | "ai-analysis" | "compare" | "profile";
interface Stats { attack: number; defense: number; speed: number; communication: number; support: number; creativity: number; }
interface TitleVote { title: string; votes: number; }
interface User { id: number; name: string; role: string; photo: string; bio: string; stats: Stats; titleVotes: TitleVote[]; rarity: Rarity; }
interface Team { id: number; name: string; code: string; memberIds: number[]; isCompleted: boolean; project: string; }
interface ChatMessage { role: "user" | "ai"; text: string; }

// ─── Config ───────────────────────────────────────────────────────────────────
const RARITY: Record<Rarity, { label: string; color: string; glow: string; border: string; bg: string }> = {
  common:    { label: "일반", color: "#9ca3af", glow: "0 0 12px rgba(156,163,175,0.25)", border: "rgba(156,163,175,0.4)",  bg: "rgba(156,163,175,0.06)" },
  rare:      { label: "희귀", color: "#60a5fa", glow: "0 0 18px rgba(96,165,250,0.45)",  border: "rgba(96,165,250,0.55)", bg: "rgba(96,165,250,0.06)" },
  epic:      { label: "에픽", color: "#a855f7", glow: "0 0 22px rgba(168,85,247,0.55)",  border: "rgba(168,85,247,0.65)", bg: "rgba(168,85,247,0.06)" },
  legendary: { label: "전설", color: "#fbbf24", glow: "0 0 28px rgba(251,191,36,0.65), 0 0 55px rgba(251,191,36,0.28)", border: "rgba(251,191,36,0.8)", bg: "rgba(251,191,36,0.06)" },
};

const STATS = [
  { key: "attack",        label: "공격력",   Icon: Swords,        color: "#ff6b35" },
  { key: "defense",       label: "방어력",   Icon: Shield,        color: "#60a5fa" },
  { key: "speed",         label: "속도",     Icon: Zap,           color: "#fbbf24" },
  { key: "communication", label: "협업",     Icon: MessageCircle, color: "#34d399" },
  { key: "support",       label: "서포트",   Icon: Heart,         color: "#f472b6" },
  { key: "creativity",    label: "창의성",   Icon: Lightbulb,     color: "#a78bfa" },
];

const TITLES = [
  "코드의 마법사","버그 헌터","팀의 기둥","아이디어 뱅크","속도의 신",
  "완벽주의자","분위기 메이커","풀스택 마스터","야근의 왕","문서화 달인",
  "디버깅 장인","든든한 서포터","깃허브 마스터","발표의 달인","창의력 폭발",
];

const AI_QUESTIONS = [
  "이 사람의 강점은?", "우리 팀 조합은 어때?", "누가 백엔드에 적합할까?",
  "팀의 시너지는?", "부족한 역할은?", "누굴 추가하면 좋을까?",
];

// ─── Mock Data ────────────────────────────────────────────────────────────────
const USERS: User[] = [
  { id:1, name:"김민준", role:"Frontend Dev", rarity:"legendary", bio:"UI는 사용자의 첫인상. 매 픽셀에 의미를 담습니다.",
    photo:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=380&fit=crop&auto=format",
    stats:{attack:88,defense:65,speed:92,communication:75,support:60,creativity:85},
    titleVotes:[{title:"속도의 신",votes:5},{title:"코드의 마법사",votes:3},{title:"야근의 왕",votes:2}] },
  { id:2, name:"이서연", role:"Backend Dev", rarity:"epic", bio:"견고한 서버가 모든 것의 시작이라고 생각합니다.",
    photo:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=380&fit=crop&auto=format",
    stats:{attack:72,defense:90,speed:68,communication:85,support:88,creativity:70},
    titleVotes:[{title:"팀의 기둥",votes:6},{title:"든든한 서포터",votes:4}] },
  { id:3, name:"박준혁", role:"Full Stack", rarity:"legendary", bio:"프론트부터 DB까지, 전체 그림을 봅니다.",
    photo:"https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=380&fit=crop&auto=format",
    stats:{attack:95,defense:78,speed:80,communication:70,support:65,creativity:92},
    titleVotes:[{title:"코드의 마법사",votes:7},{title:"풀스택 마스터",votes:5}] },
  { id:4, name:"최유진", role:"UI/UX Designer", rarity:"rare", bio:"사용자의 감정을 설계합니다. 디자인은 소통이에요.",
    photo:"https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&h=380&fit=crop&auto=format",
    stats:{attack:60,defense:55,speed:72,communication:92,support:75,creativity:95},
    titleVotes:[{title:"아이디어 뱅크",votes:6},{title:"창의력 폭발",votes:4}] },
  { id:5, name:"정현우", role:"DevOps", rarity:"epic", bio:"배포 파이프라인을 예술로 만드는 사람입니다.",
    photo:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=380&fit=crop&auto=format",
    stats:{attack:70,defense:95,speed:75,communication:65,support:80,creativity:60},
    titleVotes:[{title:"완벽주의자",votes:5},{title:"버그 헌터",votes:3}] },
  { id:6, name:"강서윤", role:"Product Manager", rarity:"rare", bio:"팀이 같은 방향을 보게 만드는 것이 제 역할입니다.",
    photo:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=380&fit=crop&auto=format",
    stats:{attack:65,defense:70,speed:78,communication:98,support:85,creativity:80},
    titleVotes:[{title:"분위기 메이커",votes:7},{title:"발표의 달인",votes:4}] },
  { id:7, name:"윤재원", role:"Backend Dev", rarity:"common", bio:"코드 한 줄 한 줄에 이유가 있어야 합니다.",
    photo:"https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=380&fit=crop&auto=format",
    stats:{attack:78,defense:82,speed:65,communication:60,support:70,creativity:55},
    titleVotes:[{title:"디버깅 장인",votes:4},{title:"문서화 달인",votes:2}] },
  { id:8, name:"한다은", role:"Frontend Dev", rarity:"epic", bio:"인터랙션 하나에 사용자의 마음을 훔칠 수 있습니다.",
    photo:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=380&fit=crop&auto=format",
    stats:{attack:82,defense:60,speed:85,communication:78,support:72,creativity:90},
    titleVotes:[{title:"창의력 폭발",votes:5},{title:"속도의 신",votes:3}] },
];

const TEAMS: Team[] = [
  { id:1, name:"알파팀", code:"ALPHA42", memberIds:[1,2,3,4], isCompleted:true,  project:"AI 기반 학습 플랫폼" },
  { id:2, name:"베타팀", code:"BETA87",  memberIds:[1,5,6,7], isCompleted:false, project:"실시간 협업 도구" },
];
const CURRENT_USER_ID = 1;
const CURRENT_USER = USERS[0];

// ─── Utilities ────────────────────────────────────────────────────────────────
const topTitles = (v: TitleVote[]) => { if (!v.length) return []; const m = Math.max(...v.map(x=>x.votes)); return v.filter(x=>x.votes===m).map(x=>x.title); };
const totalPower = (s: Stats) => Math.round(Object.values(s).reduce((a,b)=>a+b,0)/6);
const avg = (arr: number[]) => Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);

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

function aiResponse(q: string, users: User[]): string {
  const u = users[0];
  if (!u) return "분석할 카드를 먼저 선택해주세요.";
  const p = totalPower(u.stats);
  const topStat = STATS.reduce((a,b)=>u.stats[a.key as keyof Stats]>u.stats[b.key as keyof Stats]?a:b);
  const lowStat = STATS.reduce((a,b)=>u.stats[a.key as keyof Stats]<u.stats[b.key as keyof Stats]?a:b);
  if (q.includes("강점") || q.includes("장점")) return `✨ **${u.name}**의 핵심 강점은 **${topStat.label}(${u.stats[topStat.key as keyof Stats]}pt)**입니다.\n\n${topTitles(u.titleVotes).join(", ")} 칭호에서 알 수 있듯 팀원들도 이 점을 높이 평가합니다. 전체 전투력 **${p}pt**로 상위권에 속하며, 특히 빠른 실행력이 돋보입니다.`;
  if (q.includes("백엔드")) return `🔧 백엔드 적합도 분석:\n\n**${u.name}** — 방어력 ${u.stats.defense}pt, 문제해결 ${u.stats.creativity}pt\n\n안정성(방어력)이 높을수록 백엔드 적합도가 올라갑니다. ${u.stats.defense > 75 ? "이 분은 백엔드 포지션에 매우 적합합니다! 🏆" : "프론트엔드 쪽이 더 어울릴 수 있습니다."}`;
  if (q.includes("팀") && users.length > 1) {
    const as = avg(users.map(u=>u.stats.attack));
    const ds = avg(users.map(u=>u.stats.defense));
    const cs = avg(users.map(u=>u.stats.communication));
    return `⚔️ **팀 조합 분석** (${users.length}명)\n\n• 평균 공격력: ${as}pt ${as>78?"🔥":"⚠️"}\n• 평균 방어력: ${ds}pt ${ds>75?"🛡️":"⚠️"}\n• 평균 협업: ${cs}pt ${cs>78?"🤝":"💬"}\n\n${as>80&&ds>75?"이 팀은 공수 균형이 잡힌 이상적인 조합입니다!":"공격형 팀으로 빠른 개발에 강하지만 안정성 관리가 필요합니다."}\n\n몰입캠프 2주 프로젝트에 최적화된 구성이에요.`;
  }
  if (q.includes("시너지")) return `💫 **시너지 분석**\n\n${users.map(u=>`• ${u.name}: ${topTitles(u.titleVotes)[0]??u.role}`).join("\n")}\n\n다양한 역할 분포로 상호 보완적인 팀입니다. 특히 창의력과 실행력의 균형이 좋습니다.`;
  if (q.includes("부족") || q.includes("추가")) return `📊 **팀 보완 분석**\n\n현재 팀에서 상대적으로 부족한 역량:\n• **${lowStat.label}** (평균 ${u.stats[lowStat.key as keyof Stats]}pt)\n\n${lowStat.label}이 높은 팀원을 추가하거나, 해당 역량을 집중 강화할 것을 추천합니다.`;
  return `🤖 **AI 분석**\n\n${u.name}님의 전체 전투력은 **${p}pt**입니다.\n\n${STATS.map(s=>`• ${s.label}: ${u.stats[s.key as keyof Stats]}pt`).join("\n")}\n\n전반적으로 ${p>=80?"매우 강력한":"균형잡힌"} 캐릭터입니다. 더 구체적인 질문을 해보세요!`;
}

// ─── Design System ────────────────────────────────────────────────────────────
const DS = {
  card: { background:"rgba(13,21,37,0.85)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16 },
  input: { background:"rgba(0,200,255,0.05)", border:"1px solid rgba(0,200,255,0.18)", color:"#dde5f0", borderRadius:10, outline:"none" },
  glass: { background:"rgba(255,255,255,0.04)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.07)" },
};

function Btn({ children, variant="primary", onClick, disabled=false, size="md", full=false, icon }: {
  children: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"|"purple";
  onClick?: ()=>void; disabled?: boolean; size?: "sm"|"md"|"lg"; full?: boolean; icon?: React.ReactNode;
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

function Field({ label, type="text", value, onChange, placeholder, error, right }: {
  label?: string; type?: string; value: string; onChange: (v:string)=>void;
  placeholder?: string; error?: string; right?: React.ReactNode;
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
          style={{ ...DS.input, width:"100%", padding:"11px 14px", paddingRight: isPass||right ? 42 : 14, boxSizing:"border-box", fontSize:14 }}
        />
        {isPass && (
          <button onClick={()=>setShow(s=>!s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#8899bb", cursor:"pointer" }}>
            {show ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        )}
        {right && <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)" }}>{right}</div>}
      </div>
      {error && <span style={{ fontSize:11, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{error}</span>}
    </div>
  );
}

function StatSlider({ label, value, onChange, color, Icon }: { label:string; value:number; onChange:(v:number)=>void; color:string; Icon:any }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <Icon size={13} style={{ color }} />
          <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{label}</span>
        </div>
        <span style={{ fontSize:13, fontFamily:"'Orbitron',monospace", color, fontWeight:700 }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e=>onChange(+e.target.value)}
        style={{ width:"100%", accentColor:color, height:4 }} />
    </div>
  );
}

function Pill({ label, color="#00c8ff", small=false }: { label:string; color?:string; small?:boolean }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      padding: small ? "2px 8px" : "4px 10px",
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

function BigHex({ stats, size=260, users, colors }: { stats?:Stats; size?:number; users?:User[]; colors?:string[] }) {
  const data = STATS.map(s=>({ stat:s.label, ...(stats?{value:stats[s.key as keyof Stats]}:{}), ...(users?Object.fromEntries(users.map((u,i)=>[`u${i}`,u.stats[s.key as keyof Stats]])):{}), fullMark:100 }));
  const defaultColors = ["#00c8ff","#a855f7","#fbbf24"];
  return (
    <div style={{ width:"100%", height:size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{top:10,right:25,bottom:10,left:25}}>
          <PolarGrid stroke="rgba(0,200,255,0.15)"/>
          <PolarAngleAxis dataKey="stat" tick={{fill:"#8899bb",fontSize:12,fontFamily:"'Noto Sans KR'"}}/>
          {stats && <Radar dataKey="value" stroke="#00c8ff" fill="#00c8ff" fillOpacity={0.22} dot={{fill:"#00c8ff",r:3}}/>}
          {users && users.map((u,i)=>(
            <Radar key={u.id} name={u.name} dataKey={`u${i}`} stroke={(colors??defaultColors)[i]} fill={(colors??defaultColors)[i]} fillOpacity={0.18} dot={{fill:(colors??defaultColors)[i],r:2}}/>
          ))}
          {users && users.length>1 && <Legend wrapperStyle={{fontSize:12,fontFamily:"'Noto Sans KR'",paddingTop:8}}/>}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Card Components ──────────────────────────────────────────────────────────
function CardFront({ user }: { user:User }) {
  const r = RARITY[user.rarity];
  const top = topTitles(user.titleVotes);
  return (
    <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ position:"relative", flex:"0 0 58%", background:"#060c18", overflow:"hidden" }}>
        <img src={user.photo} alt={user.name} style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.82) saturate(1.1)" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 45%,#0d1525 100%)" }}/>
        <div style={{ position:"absolute", top:8, right:8, padding:"2px 7px", borderRadius:6, background:`${r.color}22`, color:r.color, border:`1px solid ${r.color}55`, fontSize:9, fontFamily:"'Orbitron',monospace", fontWeight:700 }}>{r.label}</div>
        <div style={{ position:"absolute", top:8, left:8, padding:"2px 7px", borderRadius:6, background:"rgba(0,0,0,0.6)", color:"#8899bb", fontSize:9, fontFamily:"'Orbitron',monospace" }}>PWR <span style={{color:r.color,fontWeight:700}}>{totalPower(user.stats)}</span></div>
      </div>
      <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:6, flex:1 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Black Han Sans',sans-serif", color:"#dde5f0", lineHeight:1.2 }}>{user.name}</div>
          <div style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginTop:2 }}>{user.role}</div>
        </div>
        {top[0] && <Pill label={top[0]} color={r.color} small/>}
        <div style={{ marginTop:"auto" }}>
          <MiniHex stats={user.stats} size={64} color={r.color}/>
        </div>
      </div>
    </div>
  );
}

function CardBack({ user }: { user:User }) {
  const r = RARITY[user.rarity];
  return (
    <div style={{ width:"100%", height:"100%", padding:"12px", display:"flex", flexDirection:"column", gap:10, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:14, fontWeight:700, fontFamily:"'Black Han Sans'", color:r.color }}>{user.name}</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:10, background:`${r.color}18`, color:r.color, padding:"2px 7px", borderRadius:6 }}>{totalPower(user.stats)} PT</span>
      </div>
      <BigHex stats={user.stats} size={170}/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 12px" }}>
        {STATS.map(s=>(
          <div key={s.key} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <s.Icon size={10} style={{color:s.color}}/>
            <span style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{s.label}</span>
            <span style={{ marginLeft:"auto", fontSize:11, fontFamily:"'Orbitron',monospace", color:s.color, fontWeight:700 }}>{user.stats[s.key as keyof Stats]}</span>
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

function FlipCard({ user, w=200, h=320, locked=false, onUnlock }: { user:User; w?:number; h?:number; locked?:boolean; onUnlock?:()=>void }) {
  const [flipped, setFlipped] = useState(false);
  const r = RARITY[user.rarity];
  return (
    <div style={{ width:w, height:h, perspective:1200, cursor:"pointer", flexShrink:0 }} onClick={()=>!locked&&setFlipped(f=>!f)}>
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
        <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", transform:"rotateY(180deg)", borderRadius:14, border:`1.5px solid ${r.border}`, boxShadow:r.glow, background:"#0d1525", overflow:"hidden" }}>
          <CardBack user={user}/>
        </div>
      </div>
    </div>
  );
}

function GridCard({ user, onClick }: { user:User; onClick:()=>void }) {
  const [hover, setHover] = useState(false);
  const r = RARITY[user.rarity];
  const top = topTitles(user.titleVotes);
  return (
    <div
      onClick={onClick}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        width:158, flexShrink:0,
        background:"#0d1525",
        borderRadius:14,
        border:`1.5px solid ${hover?r.border:"rgba(255,255,255,0.07)"}`,
        boxShadow:hover?r.glow:"none",
        overflow:"hidden",
        cursor:"pointer",
        transition:"all 0.22s",
        transform:hover?"translateY(-5px) scale(1.03)":"none",
      }}
    >
      <div style={{ height:110, background:"#060c18", position:"relative", overflow:"hidden" }}>
        <img src={user.photo} alt={user.name} style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.8)" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 50%,#0d1525 100%)" }}/>
        <span style={{ position:"absolute", top:6, right:6, fontSize:9, padding:"2px 6px", borderRadius:5, background:`${r.color}22`, color:r.color, fontFamily:"'Orbitron',monospace", fontWeight:700 }}>{r.label}</span>
      </div>
      <div style={{ padding:"8px 10px" }}>
        <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0" }}>{user.name}</div>
        <div style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:6 }}>{user.role}</div>
        {top[0] && <Pill label={top[0]} color={r.color} small/>}
        <div style={{ marginTop:8, display:"flex", justifyContent:"center" }}>
          <MiniHex stats={user.stats} size={60} color={r.color}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
          <span style={{ fontSize:9, color:"#4a5a7a", fontFamily:"'Orbitron',monospace" }}>PWR</span>
          <span style={{ fontSize:12, fontFamily:"'Orbitron',monospace", color:r.color, fontWeight:700 }}>{totalPower(user.stats)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Screens ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin:(first:boolean)=>void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  function handle() {
    if (!id||!pw){setErr("아이디와 비밀번호를 입력해주세요."); return;}
    setLoading(true);
    setTimeout(()=>{ setLoading(false); onLogin(id==="new"); }, 1200);
  }
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#070b12", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 20% 20%, rgba(0,200,255,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.06) 0%, transparent 50%)" }}/>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(0,200,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,255,0.04) 1px,transparent 1px)", backgroundSize:"40px 40px" }}/>
      <div style={{ ...DS.card, width:380, padding:"40px 36px", position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,rgba(0,200,255,0.2),rgba(168,85,247,0.2))", border:"1px solid rgba(0,200,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
            <Trophy size={26} style={{color:"#00c8ff"}}/>
          </div>
          <h1 style={{ fontSize:22, fontFamily:"'Orbitron',monospace", color:"#00c8ff", fontWeight:900, letterSpacing:"0.06em" }}>MOLIP CAMP</h1>
          <p style={{ fontSize:12, color:"#4a5a7a", fontFamily:"'Noto Sans KR'", marginTop:4 }}>학교 계정으로 로그인</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="아이디" value={id} onChange={setId} placeholder="학번 또는 이메일"/>
          <Field label="비밀번호" type="password" value={pw} onChange={setPw} placeholder="비밀번호 입력"/>
          {err && <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)" }}>
            <AlertTriangle size={13} style={{color:"#ef4444",flexShrink:0}}/>
            <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>
          </div>}
          <Btn full onClick={handle} disabled={loading} icon={loading?<RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/>:undefined}>
            {loading?"로그인 중...":"로그인"}
          </Btn>
          <p style={{ fontSize:11, color:"#4a5a7a", textAlign:"center", fontFamily:"'Noto Sans KR'" }}>
            테스트: 아이디 <span style={{color:"#00c8ff"}}>"new"</span> 입력 시 최초 로그인 흐름
          </p>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordScreen({ onDone }: { onDone:()=>void }) {
  const [cur, setCur] = useState("");
  const [np, setNp] = useState("");
  const [nc, setNc] = useState("");
  const [err, setErr] = useState("");
  function handle() {
    if (!cur){setErr("현재 비밀번호를 입력해주세요."); return;}
    if (np.length<8){setErr("새 비밀번호는 8자 이상이어야 합니다."); return;}
    if (np!==nc){setErr("새 비밀번호가 일치하지 않습니다."); return;}
    onDone();
  }
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#070b12", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 50% 30%, rgba(168,85,247,0.08) 0%, transparent 60%)" }}/>
      <div style={{ ...DS.card, width:400, padding:"38px 36px", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Lock size={16} style={{color:"#a855f7"}}/>
          </div>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0" }}>비밀번호 변경</h2>
            <p style={{ fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>최초 로그인 시 비밀번호를 변경해주세요</p>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="현재 비밀번호" type="password" value={cur} onChange={setCur} placeholder="기존 비밀번호"/>
          <Field label="새 비밀번호" type="password" value={np} onChange={setNp} placeholder="8자 이상"/>
          <Field label="새 비밀번호 확인" type="password" value={nc} onChange={setNc} placeholder="다시 입력"/>
          {np && (
            <div>
              <Progress value={np.length>12?100:np.length>7?66:np.length>3?33:0} color={np.length>12?"#34d399":np.length>7?"#fbbf24":"#ef4444"}/>
              <span style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginTop:3, display:"block" }}>
                {np.length>12?"강력한 비밀번호":np.length>7?"보통":"취약한 비밀번호"} ({np.length}자)
              </span>
            </div>
          )}
          {err && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>}
          <Btn full variant="purple" onClick={handle}>변경하기</Btn>
        </div>
      </div>
    </div>
  );
}

function ProfileSetupScreen({ onDone }: { onDone:()=>void }) {
  const [step, setStep] = useState<"photo"|"bio"|"stats">("photo");
  const [bio, setBio] = useState("");
  const [photoSet, setPhotoSet] = useState(false);
  const [stats, setStats] = useState({attack:5,defense:5,speed:5,communication:5,support:5,creativity:5});
  const steps = ["photo","bio","stats"];
  const stepIdx = steps.indexOf(step);
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
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
            <div
              onClick={()=>setPhotoSet(p=>!p)}
              style={{ width:120, height:120, borderRadius:999, border:`2px dashed ${photoSet?"rgba(52,211,153,0.6)":"rgba(0,200,255,0.3)"}`, background:"rgba(0,200,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative", overflow:"hidden", transition:"all 0.2s" }}
            >
              {photoSet
                ? <img src={CURRENT_USER.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:999 }}/>
                : <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <Camera size={28} style={{color:"#00c8ff"}}/>
                    <span style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>클릭하여 업로드</span>
                  </div>
              }
            </div>
            {photoSet && <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#34d399", fontFamily:"'Noto Sans KR'" }}><CheckCircle2 size={14}/>사진이 설정되었습니다</div>}
            <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
              <Btn full onClick={()=>setStep("bio")}>다음</Btn>
              <Btn full variant="ghost" onClick={()=>setStep("bio")}>나중에 설정</Btn>
            </div>
          </div>
        )}

        {step==="bio" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>한줄 자기소개</span>
                <span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:bio.length>45?"#ef4444":"#4a5a7a" }}>{bio.length}/50</span>
              </div>
              <textarea
                value={bio}
                onChange={e=>e.target.value.length<=50&&setBio(e.target.value)}
                placeholder="나를 한 문장으로 소개한다면..."
                rows={3}
                style={{ ...DS.input, width:"100%", padding:"11px 14px", resize:"none", fontFamily:"'Noto Sans KR'", fontSize:14, lineHeight:1.6, boxSizing:"border-box" }}
              />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="ghost" onClick={()=>setStep("photo")}>이전</Btn>
              <Btn full onClick={()=>setStep("stats")}>다음</Btn>
            </div>
          </div>
        )}

        {step==="stats" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:2 }}>자신의 초기 능력치를 입력하세요 (1-10)</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 24px" }}>
              {STATS.map(s=>(
                <StatSlider key={s.key} label={s.label} value={stats[s.key as keyof typeof stats]} onChange={v=>setStats(p=>({...p,[s.key]:v}))} color={s.color} Icon={s.Icon}/>
              ))}
            </div>
            <div style={{ padding:"12px", borderRadius:10, background:"rgba(0,200,255,0.04)", border:"1px solid rgba(0,200,255,0.1)", marginTop:4 }}>
              <div style={{ display:"flex", justifyContent:"center" }}>
                <MiniHex stats={Object.fromEntries(STATS.map(s=>[s.key, stats[s.key as keyof typeof stats]*10])) as unknown as Stats} size={100} color="#00c8ff"/>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="ghost" onClick={()=>setStep("bio")}>이전</Btn>
              <Btn full variant="purple" onClick={onDone} icon={<CheckCircle2 size={14}/>}>완료</Btn>
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
  return (
    <aside style={{ width:220, minHeight:"100vh", background:"rgba(5,8,16,0.96)", backdropFilter:"blur(12px)", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"20px 18px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(0,200,255,0.2),rgba(168,85,247,0.2))", border:"1px solid rgba(0,200,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Trophy size={15} style={{color:"#00c8ff"}}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:"#00c8ff", fontWeight:900, letterSpacing:"0.04em" }}>MOLIP</div>
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
            <img src={CURRENT_USER.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{CURRENT_USER.name}</div>
            <div style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{CURRENT_USER.role}</div>
          </div>
          <button onClick={onLogout} style={{ background:"none", border:"none", color:"#4a5a7a", cursor:"pointer", padding:4 }} title="로그아웃"><LogOut size={13}/></button>
        </div>
      </div>
    </aside>
  );
}

// ─── Pokedex Screen ───────────────────────────────────────────────────────────
function PokedexScreen({ evalDone, onEval }: { evalDone:boolean; onEval:()=>void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Rarity|"all">("all");
  const [sort, setSort] = useState<"name"|"power"|"rarity">("power");
  const [modal, setModal] = useState<User|null>(null);
  const rarities: (Rarity|"all")[] = ["all","legendary","epic","rare","common"];

  const filtered = useMemo(()=>{
    let u = USERS.filter(u=>u.name.includes(search)||u.role.toLowerCase().includes(search.toLowerCase()));
    if (filter!=="all") u=u.filter(x=>x.rarity===filter);
    return [...u].sort((a,b)=>{
      if (sort==="name") return a.name.localeCompare(b.name);
      if (sort==="power") return totalPower(b.stats)-totalPower(a.stats);
      const ord={legendary:0,epic:1,rare:2,common:3};
      return ord[a.rarity]-ord[b.rarity];
    });
  },[search,filter,sort]);

  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", marginBottom:4 }}>몰입캠프 도감</h1>
        <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>전체 {USERS.length}명의 참가자 카드</p>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:20, alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px", borderRadius:9, ...DS.glass, flex:"1 1 200px", minWidth:160 }}>
          <Search size={13} style={{color:"#8899bb",flexShrink:0}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름 또는 역할 검색..." style={{ background:"none", border:"none", outline:"none", color:"#dde5f0", fontSize:13, fontFamily:"'Noto Sans KR'", width:"100%" }}/>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {rarities.map(r=>(
            <button key={r} onClick={()=>setFilter(r)} style={{
              padding:"6px 11px", borderRadius:7, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s",
              background:filter===r?(r==="all"?"rgba(0,200,255,0.15)":RARITY[r as Rarity].bg):"rgba(255,255,255,0.03)",
              color:filter===r?(r==="all"?"#00c8ff":RARITY[r as Rarity].color):"#8899bb",
              border:`1px solid ${filter===r?(r==="all"?"rgba(0,200,255,0.3)":RARITY[r as Rarity].border):"rgba(255,255,255,0.07)"}`,
            }}>{r==="all"?"전체":RARITY[r as Rarity].label}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {[{k:"power",l:"전투력"},{k:"name",l:"이름"},{k:"rarity",l:"희귀도"}].map(({k,l})=>(
            <button key={k} onClick={()=>setSort(k as typeof sort)} style={{
              padding:"6px 10px", borderRadius:7, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s",
              background:sort===k?"rgba(168,85,247,0.12)":"rgba(255,255,255,0.03)",
              color:sort===k?"#a855f7":"#8899bb",
              border:`1px solid ${sort===k?"rgba(168,85,247,0.3)":"rgba(255,255,255,0.07)"}`,
              display:"flex", alignItems:"center", gap:4,
            }}><ArrowUpDown size={10}/>{l}</button>
          ))}
        </div>
        <span style={{ fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>{filtered.length}명</span>
      </div>

      {/* Grid */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:16 }}>
        {filtered.map(u=>(
          <GridCard key={u.id} user={u} onClick={()=>setModal(u)}/>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(4,7,14,0.82)", backdropFilter:"blur(8px)" }} onClick={()=>setModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"relative" }}>
            <button onClick={()=>setModal(null)} style={{ position:"absolute", top:-42, right:0, width:32, height:32, borderRadius:999, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"#8899bb", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15}/></button>
            <FlipCard user={modal} w={300} h={460} locked={!evalDone&&modal.id!==CURRENT_USER_ID} onUnlock={onEval}/>
            <p style={{ textAlign:"center", marginTop:10, fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>카드를 클릭해 앞/뒤를 확인하세요</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Teams Screen ─────────────────────────────────────────────────────────────
function TeamsScreen() {
  const [tab, setTab] = useState<"list"|"create"|"join">("list");
  const [tname, setTname] = useState(""); const [tproj, setTproj] = useState("");
  const [code, setCode] = useState("");
  const [created, setCreated] = useState<string|null>(null);
  const [copied, setCopied] = useState(false);
  const myTeams = TEAMS.filter(t=>t.memberIds.includes(CURRENT_USER_ID));
  function create() { if(!tname) return; setCreated(tname.toUpperCase().slice(0,5)+(Math.floor(Math.random()*90)+10)); }
  function copy(c:string){navigator.clipboard.writeText(c);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", marginBottom:20 }}>팀 관리</h1>
      <div style={{ display:"flex", gap:6, marginBottom:24 }}>
        {[{k:"list",l:"내 팀",Icon:Users},{k:"create",l:"팀 만들기",Icon:Plus},{k:"join",l:"팀 참여",Icon:UserPlus}].map(({k,l,Icon})=>(
          <Btn key={k} variant={tab===k?"secondary":"ghost"} onClick={()=>{setTab(k as typeof tab);setCreated(null);}} icon={<Icon size={13}/>}>{l}</Btn>
        ))}
      </div>
      {tab==="list" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {myTeams.map(team=>{
            const members=USERS.filter(u=>team.memberIds.includes(u.id));
            return (
              <div key={team.id} style={{ ...DS.card, padding:"18px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0" }}>{team.name}</div>
                    <div style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginTop:2 }}>{team.project}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                    <Pill label={team.isCompleted?"✓ 완료":"진행 중"} color={team.isCompleted?"#34d399":"#00c8ff"} small/>
                    <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#4a5a7a", fontFamily:"'Orbitron',monospace" }}>
                      <Hash size={9}/>{team.code}
                      <button onClick={()=>copy(team.code)} style={{background:"none",border:"none",color:"#4a5a7a",cursor:"pointer",padding:2}}><Copy size={10}/></button>
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  {members.map(u=>{
                    const r=RARITY[u.rarity];
                    return (
                      <div key={u.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ width:38, height:38, borderRadius:999, overflow:"hidden", border:`2px solid ${r.color}` }}>
                          <img src={u.photo} alt={u.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        </div>
                        <span style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{u.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab==="create" && (
        <div style={{ ...DS.card, padding:"24px", maxWidth:420 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="팀 이름" value={tname} onChange={setTname} placeholder="예) 감마팀"/>
            <Field label="프로젝트 주제" value={tproj} onChange={setTproj} placeholder="예) 소셜 임팩트 앱"/>
            <Btn icon={<Plus size={13}/>} onClick={create}>팀 생성</Btn>
            {created && (
              <div style={{ padding:"16px", borderRadius:10, background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.25)" }}>
                <p style={{ fontSize:12, color:"#34d399", fontFamily:"'Noto Sans KR'", marginBottom:8 }}>✓ 팀이 생성되었습니다! 초대 코드를 공유하세요.</p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:24, fontFamily:"'Orbitron',monospace", color:"#34d399", fontWeight:700, letterSpacing:"0.15em" }}>{created}</span>
                  <button onClick={()=>copy(created)} style={{ padding:"6px 12px", borderRadius:8, background:"rgba(52,211,153,0.15)", color:"#34d399", border:"1px solid rgba(52,211,153,0.3)", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans KR'", display:"flex", alignItems:"center", gap:5 }}>
                    {copied?<Check size={12}/>:<Copy size={12}/>}{copied?"복사됨":"복사"}
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
              <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="XXXXX00" style={{ background:"none", border:"none", outline:"none", padding:"11px 10px", color:"#00c8ff", fontSize:18, fontFamily:"'Orbitron',monospace", letterSpacing:"0.18em", flex:1 }}/>
            </div>
            <Btn full variant="purple" disabled={code.length<5} icon={<UserPlus size={13}/>}>팀 참여하기</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Evaluate Screen ──────────────────────────────────────────────────────────
function EvaluateScreen({ onDone }: { onDone:()=>void }) {
  const teammates = USERS.filter(u=>u.id!==CURRENT_USER_ID&&TEAMS[0].memberIds.includes(u.id));
  const [ratings, setRatings] = useState<Record<number,Partial<Stats>>>(()=>Object.fromEntries(teammates.map(u=>[u.id,{attack:5,defense:5,speed:5,communication:5,support:5,creativity:5}])));
  const [titles, setTitles] = useState<Record<number,string>>({});
  const [done, setDone] = useState<number[]>([]);
  const progress = Math.round((done.length/teammates.length)*100);
  function submit(uid:number){if(!titles[uid])return; setDone(p=>[...p,uid]); if(done.length+1===teammates.length)setTimeout(onDone,600);}
  function setR(uid:number,key:string,v:number){setRatings(p=>({...p,[uid]:{...p[uid],[key]:v}}))}
  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", marginBottom:4 }}>팀원 평가</h1>
        <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:12 }}>{TEAMS[0].name} — {TEAMS[0].project} 프로젝트 종료 후 평가</p>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1 }}><Progress value={progress} color={progress===100?"#34d399":"#00c8ff"}/></div>
          <span style={{ fontSize:12, fontFamily:"'Orbitron',monospace", color:progress===100?"#34d399":"#00c8ff", fontWeight:700 }}>{done.length}/{teammates.length}</span>
        </div>
      </div>
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
          const r=RARITY[u.rarity]; const isDone=done.includes(u.id);
          return (
            <div key={u.id} style={{ ...DS.card, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", background:isDone?"rgba(52,211,153,0.04)":"rgba(255,255,255,0.01)", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:999, overflow:"hidden", border:`2px solid ${r.color}`, flexShrink:0 }}><img src={u.photo} alt={u.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Black Han Sans'", color:r.color }}>{u.name}</div>
                  <div style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{u.role}</div>
                </div>
                {isDone && <Pill label="✓ 완료" color="#34d399" small/>}
              </div>
              {!isDone && (
                <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}>
                  <div>
                    <p style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:8 }}>칭호 선택 <span style={{color:"#4a5a7a"}}>(1개 선택)</span></p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {TITLES.map(t=>{
                        const sel=titles[u.id]===t;
                        return <button key={t} onClick={()=>setTitles(p=>({...p,[u.id]:t}))} style={{ padding:"4px 10px", borderRadius:999, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s", background:sel?"rgba(0,200,255,0.15)":"rgba(255,255,255,0.03)", color:sel?"#00c8ff":"#8899bb", border:`1px solid ${sel?"rgba(0,200,255,0.4)":"rgba(255,255,255,0.07)"}` }}>{t}</button>;
                      })}
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 24px" }}>
                    {STATS.map(s=>(
                      <StatSlider key={s.key} label={s.label} value={(ratings[u.id]?.[s.key as keyof Stats]??5) as number} onChange={v=>setR(u.id,s.key,v)} color={s.color} Icon={s.Icon}/>
                    ))}
                  </div>
                  <div style={{ display:"flex", justifyContent:"flex-end" }}>
                    <Btn disabled={!titles[u.id]} onClick={()=>submit(u.id)} icon={<Check size={13}/>}>평가 제출</Btn>
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
  const [selected, setSelected] = useState<number[]>([1]);
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ role:"ai", text:"안녕하세요! 선택된 카드를 기반으로 팀원 분석을 도와드립니다. 아래 예시 질문을 선택하거나 직접 입력해보세요." }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [displayIdx, setDisplayIdx] = useState<number>(-1);
  const [displayText, setDisplayText] = useState("");
  const msgEnd = useRef<HTMLDivElement>(null);
  const selUsers = USERS.filter(u=>selected.includes(u.id));

  function toggleSel(id:number){setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  function send(q:string){
    if(!q.trim()) return;
    const newMsgs=[...msgs,{role:"user" as const,text:q}];
    setMsgs(newMsgs); setInput(""); setTyping(true);
    setTimeout(()=>{
      const resp=aiResponse(q,selUsers);
      setMsgs(m=>[...m,{role:"ai",text:resp}]);
      setDisplayIdx(newMsgs.length); setTyping(false); setDisplayText("");
    },1500);
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
        {USERS.map(u=>{
          const r=RARITY[u.rarity]; const sel=selected.includes(u.id);
          return (
            <div key={u.id} onClick={()=>toggleSel(u.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:9, cursor:"pointer", background:sel?r.bg:"rgba(255,255,255,0.02)", border:`1px solid ${sel?r.border:"rgba(255,255,255,0.06)"}`, transition:"all 0.15s" }}>
              <div style={{ width:28, height:28, borderRadius:999, overflow:"hidden", border:`1.5px solid ${sel?r.color:"transparent"}`, flexShrink:0 }}><img src={u.photo} alt={u.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, fontFamily:"'Black Han Sans'", color:sel?r.color:"#dde5f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name}</div>
                <div style={{ fontSize:9, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{u.role}</div>
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
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0" }}>AI 팀 분석</div>
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
        {/* Example Qs */}
        <div style={{ padding:"8px 20px 0", display:"flex", flexWrap:"wrap", gap:5 }}>
          {AI_QUESTIONS.map(q=>(
            <button key={q} onClick={()=>send(q)} style={{ padding:"5px 11px", borderRadius:999, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", background:"rgba(168,85,247,0.08)", color:"#a855f7", border:"1px solid rgba(168,85,247,0.2)", transition:"all 0.15s" }}>{q}</button>
          ))}
        </div>
        {/* Input */}
        <div style={{ padding:"12px 20px 20px", display:"flex", gap:8 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder="질문을 입력하세요..." style={{ ...DS.input, flex:1, padding:"11px 14px", fontSize:13 }}/>
          <button onClick={()=>send(input)} disabled={!input.trim()||typing} style={{ width:42, height:42, borderRadius:10, background:input.trim()&&!typing?"linear-gradient(135deg,#00c8ff,#0080b0)":"rgba(255,255,255,0.05)", color:input.trim()&&!typing?"#060c18":"#4a5a7a", border:"none", cursor:input.trim()&&!typing?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Send size={16}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Compare Screen ───────────────────────────────────────────────────────────
function CompareScreen() {
  const [selected, setSelected] = useState<number[]>([1,3]);
  const selUsers = USERS.filter(u=>selected.includes(u.id));
  const colors = ["#00c8ff","#a855f7","#fbbf24"];
  function toggle(id:number){setSelected(p=>p.includes(id)?p.filter(x=>x!==id):p.length<3?[...p,id]:p);}
  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", marginBottom:20 }}>카드 비교</h1>
      {/* User selector */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:20 }}>
        {USERS.map(u=>{
          const r=RARITY[u.rarity]; const sel=selected.includes(u.id);
          const ci=selected.indexOf(u.id);
          return (
            <button key={u.id} onClick={()=>toggle(u.id)} style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 12px", borderRadius:9, cursor:"pointer", background:sel?r.bg:"rgba(255,255,255,0.03)", border:`1.5px solid ${sel?(colors[ci]??r.color):"rgba(255,255,255,0.07)"}`, transition:"all 0.15s" }}>
              <div style={{ width:22, height:22, borderRadius:999, overflow:"hidden", border:`1.5px solid ${sel?(colors[ci]??r.color):"transparent"}` }}><img src={u.photo} alt={u.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
              <span style={{ fontSize:12, fontFamily:"'Black Han Sans'", color:sel?(colors[ci]??r.color):"#8899bb" }}>{u.name}</span>
              {sel && <div style={{ width:8, height:8, borderRadius:999, background:colors[ci]??r.color }}/>}
            </button>
          );
        })}
        <span style={{ fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'", display:"flex", alignItems:"center" }}>최대 3명</span>
      </div>

      {selUsers.length>=2 ? (
        <>
          {/* VS Cards */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", marginBottom:24 }}>
            {selUsers.map((u,i)=>(
              <div key={u.id} style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <FlipCard user={u} w={160} h={250}/>
                  <div style={{ width:10, height:10, borderRadius:999, background:colors[i] }}/>
                </div>
                {i<selUsers.length-1 && <div style={{ fontSize:24, fontWeight:900, fontFamily:"'Orbitron',monospace", color:"rgba(255,255,255,0.15)" }}>VS</div>}
              </div>
            ))}
          </div>
          {/* Radar comparison */}
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", marginBottom:12 }}>능력치 비교</h3>
            <BigHex users={selUsers} size={280} colors={colors}/>
            {/* Stat table */}
            <div style={{ marginTop:16, overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'Noto Sans KR'" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:"left", padding:"6px 8px", color:"#4a5a7a", fontWeight:400 }}>능력치</th>
                    {selUsers.map((u,i)=><th key={u.id} style={{ textAlign:"center", padding:"6px 8px", color:colors[i], fontFamily:"'Black Han Sans'" }}>{u.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {STATS.map(s=>{
                    const vals=selUsers.map(u=>u.stats[s.key as keyof Stats]);
                    const mx=Math.max(...vals);
                    return (
                      <tr key={s.key} style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding:"8px", display:"flex", alignItems:"center", gap:6 }}><s.Icon size={11} style={{color:s.color}}/><span style={{color:"#8899bb"}}>{s.label}</span></td>
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
          <p style={{ fontSize:13, color:"#4a5a7a", fontFamily:"'Noto Sans KR'", marginTop:12 }}>비교할 캐릭터를 2~3명 선택해주세요</p>
        </div>
      )}
    </div>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
function ProfileScreen() {
  const u = CURRENT_USER; const r = RARITY[u.rarity];
  const [bio, setBio] = useState(u.bio);
  const [saved, setSaved] = useState(false);
  function save(){setSaved(true);setTimeout(()=>setSaved(false),2000);}
  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", marginBottom:24 }}>내 프로필</h1>
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
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", marginBottom:14 }}>프로필 수정</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Photo */}
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:56, height:56, borderRadius:999, overflow:"hidden", border:`2px solid ${r.color}`, flexShrink:0 }}><img src={u.photo} alt={u.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
                <Btn variant="ghost" size="sm" icon={<Upload size={12}/>}>사진 변경</Btn>
              </div>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>한줄 자기소개</span>
                  <span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:bio.length>45?"#ef4444":"#4a5a7a" }}>{bio.length}/50</span>
                </div>
                <textarea value={bio} onChange={e=>e.target.value.length<=50&&setBio(e.target.value)} rows={2} style={{ ...DS.input, width:"100%", padding:"10px 12px", resize:"none", fontFamily:"'Noto Sans KR'", fontSize:13, lineHeight:1.6, boxSizing:"border-box" }}/>
              </div>
              <Btn icon={saved?<CheckCircle2 size={13}/>:undefined} variant={saved?"ghost":"primary"} onClick={save}>{saved?"저장됨":"저장하기"}</Btn>
            </div>
          </div>
          {/* Stats overview */}
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", marginBottom:12 }}>초기 능력치 현황</h3>
            <BigHex stats={u.stats} size={220}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px", marginTop:8 }}>
              {STATS.map(s=>(
                <div key={s.key} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <s.Icon size={11} style={{color:s.color}}/>
                  <span style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{s.label}</span>
                  <span style={{ marginLeft:"auto", fontSize:12, fontFamily:"'Orbitron',monospace", color:s.color, fontWeight:700 }}>{u.stats[s.key as keyof Stats]}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Titles */}
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Black Han Sans'", color:"#dde5f0", marginBottom:12 }}>받은 칭호</h3>
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

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [authPhase, setAuthPhase] = useState<AuthPhase>("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [evalDone, setEvalDone] = useState(false);
  const [screen, setScreen] = useState<MainScreen>("pokedex");

  function handleLogin(isFirst: boolean) {
    if (isFirst) { setAuthPhase("change-password"); }
    else { setIsLoggedIn(true); }
  }
  function handlePasswordChanged() { setAuthPhase("profile-setup"); }
  function handleProfileDone() { setIsLoggedIn(true); }
  function handleLogout() { setIsLoggedIn(false); setAuthPhase("login"); setEvalDone(false); setScreen("pokedex"); }

  if (!isLoggedIn) {
    if (authPhase==="login") return <LoginScreen onLogin={handleLogin}/>;
    if (authPhase==="change-password") return <ChangePasswordScreen onDone={handlePasswordChanged}/>;
    if (authPhase==="profile-setup") return <ProfileSetupScreen onDone={handleProfileDone}/>;
  }

  return (
    <div style={{ display:"flex", height:"100vh", background:"#070b12", overflow:"hidden" }}>
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
      <Sidebar screen={screen} setScreen={s=>{setScreen(s);}} onLogout={handleLogout}/>
      <main style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {screen==="pokedex"     && <PokedexScreen evalDone={evalDone} onEval={()=>setScreen("evaluate")}/>}
        {screen==="teams"       && <TeamsScreen/>}
        {screen==="evaluate"    && <EvaluateScreen onDone={()=>setEvalDone(true)}/>}
        {screen==="ai-analysis" && <AIScreen/>}
        {screen==="compare"     && <CompareScreen/>}
        {screen==="profile"     && <ProfileScreen/>}
      </main>
    </div>
  );
}
