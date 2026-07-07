import { useState, useEffect } from "react";
import { Notebook, ChevronRight, LogOut, Telescope, Users, Star, Sparkles, BarChart2, User } from "lucide-react";
import { getMyProfile, type UserProfileDto } from "../api";
import type { MainScreen } from "../types";
import { RARITY } from "../constants/rarity";
import { FALLBACK_AVATAR, handleImgError } from "../lib/avatar";

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV = [
  { id:"pokedex" as MainScreen,     label:"은하",       Icon:Telescope },
  { id:"teams" as MainScreen,       label:"팀 관리",    Icon:Users     },
  { id:"evaluate" as MainScreen,    label:"팀원 평가",  Icon:Star      },
  { id:"ai-analysis" as MainScreen, label:"AI 분석",    Icon:Sparkles  },
  { id:"compare" as MainScreen,     label:"카드 비교",  Icon:BarChart2 },
  { id:"profile" as MainScreen,     label:"내 프로필",  Icon:User      },
];

export function Sidebar({ screen, setScreen, onLogout }: { screen:MainScreen; setScreen:(s:MainScreen)=>void; onLogout:()=>void }) {
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
