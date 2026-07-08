import { useState, useEffect } from "react";
import { Telescope, Users, Star, Sparkles, BarChart2, User, LogOut } from "lucide-react";
import { getMyProfile, type UserProfileDto } from "../api";
import type { MainScreen } from "../types";
import { SPACE, FONT, starColorFor } from "../design-system/space";
import { FALLBACK_AVATAR, handleImgError } from "../lib/avatar";

// ─── Sidebar (design.md: 화면 밖 네 모서리 HUD 언어를 내비게이션에도 그대로 적용) ──────
// EN mono 라벨 + KR 보조 라벨의 이중 언어 문법은 TeamsScreen 탭과 동일하게 맞춘다.
const NAV = [
  { id:"pokedex" as MainScreen,     en:"GALAXY",   kr:"은하",       Icon:Telescope },
  { id:"teams" as MainScreen,       en:"TEAMS",    kr:"팀 관리",    Icon:Users     },
  { id:"evaluate" as MainScreen,    en:"OBSERVE",  kr:"팀원 평가",  Icon:Star      },
  { id:"ai-analysis" as MainScreen, en:"CORE",     kr:"AI 분석",    Icon:Sparkles  },
  { id:"compare" as MainScreen,     en:"COMPARE",  kr:"별자리 비교", Icon:BarChart2 },
  { id:"profile" as MainScreen,     en:"SELF-LOG", kr:"내 프로필",  Icon:User      },
];

export function Sidebar({ screen, setScreen, onLogout }: { screen:MainScreen; setScreen:(s:MainScreen)=>void; onLogout:()=>void }) {
  const [me, setMe] = useState<UserProfileDto|null>(null);
  useEffect(()=>{ getMyProfile().then(setMe).catch(()=>{}); },[]);
  const myColor = me ? starColorFor(me.id).color : SPACE.accentTeal;

  return (
    <aside style={{
      width:224, minHeight:"100vh", flexShrink:0, display:"flex", flexDirection:"column",
      background:"linear-gradient(180deg, rgba(4,9,24,0.94), rgba(8,17,38,0.9))",
      backdropFilter:"blur(14px)", borderRight:`1px solid ${SPACE.border}`,
    }}>
      <div style={{ padding:"22px 18px 18px", borderBottom:`1px solid ${SPACE.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:34, height:34, borderRadius:3, flexShrink:0,
            background:"rgba(125,180,255,0.06)", border:`1px solid ${SPACE.borderStrong}`,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Telescope size={16} style={{ color:SPACE.accentSky }}/>
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:FONT.display, fontSize:13, fontWeight:600, letterSpacing:"3px", color:SPACE.starWhite2 }}>MADNOVA</div>
            <div style={{ fontFamily:FONT.hud, fontSize:8.5, letterSpacing:"1.5px", color:SPACE.label, marginTop:2, whiteSpace:"nowrap" }}>DEEP-SKY OBSERVATORY</div>
          </div>
        </div>
      </div>

      <nav style={{ flex:1, padding:"12px 10px", display:"flex", flexDirection:"column", gap:3 }}>
        {NAV.map(item=>{
          const active = screen===item.id;
          return (
            <button
              key={item.id}
              onClick={()=>setScreen(item.id)}
              style={{
                width:"100%", display:"flex", alignItems:"center", gap:10,
                padding:"9px 11px", borderRadius:2,
                background: active ? "rgba(94,234,212,0.08)" : "transparent",
                border:`1px solid ${active ? "rgba(94,234,212,0.4)" : "transparent"}`,
                boxShadow: active ? "0 0 14px rgba(94,234,212,0.14)" : "none",
                cursor:"pointer", textAlign:"left", transition:"all 0.15s",
              }}
            >
              <item.Icon size={14} style={{ color: active ? SPACE.accentTeal : SPACE.textDim, flexShrink:0 }}/>
              <div style={{ minWidth:0, display:"flex", flexDirection:"column", gap:1 }}>
                <span style={{ fontFamily:FONT.hud, fontSize:9, letterSpacing:"1.8px", color: active ? SPACE.accentTeal : SPACE.label }}>{item.en}</span>
                <span style={{ fontFamily:FONT.body, fontSize:12, color: active ? SPACE.starWhite2 : SPACE.textDim, fontWeight: active ? 500 : 400 }}>{item.kr}</span>
              </div>
            </button>
          );
        })}
      </nav>

      <div style={{ padding:"14px 10px", borderTop:`1px solid ${SPACE.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 9px", borderRadius:2, background:"rgba(125,180,255,0.04)" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", overflow:"hidden", border:`1.5px solid ${myColor}`, flexShrink:0, boxShadow:`0 0 8px ${myColor}55` }}>
            <img src={me?.profileImageUrl || FALLBACK_AVATAR} alt="" onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:500, fontFamily:FONT.body, color:SPACE.starWhite2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{me?.name ?? "..."}</div>
          </div>
          <button onClick={onLogout} style={{ background:"none", border:"none", color:SPACE.label, cursor:"pointer", padding:4, display:"flex" }} title="로그아웃"><LogOut size={13}/></button>
        </div>
      </div>
    </aside>
  );
}
