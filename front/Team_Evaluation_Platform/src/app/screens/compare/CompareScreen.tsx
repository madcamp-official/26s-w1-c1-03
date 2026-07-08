import { useState, useEffect } from "react";
import { RefreshCw, Lock, Check } from "lucide-react";
import { listCards, ApiError } from "../../api";
import type { Stats, User } from "../../types";
import { STATS } from "../../constants/stats";
import { cardToUser, deriveEvaluationLocked } from "../../lib/cardMapping";
import { useIsMobile } from "../../lib/useIsMobile";
import { SPACE, observatoryCode } from "../../design-system/space";
import { SpaceBackground } from "../../design-system/SpaceBackground";
import { HoloPanel } from "../../design-system/HoloPanel";
import { HudLabel } from "../../design-system/HudLabel";
import { StarPortrait } from "../../design-system/StarPortrait";
import { ConstellationChart } from "../../design-system/ConstellationChart";
import { InfoTooltip } from "../../design-system/primitives";

const FONT_BODY = "'Noto Sans KR'";
const FONT_DISPLAY = "'Space Grotesk'";
const FONT_HUD = "'IBM Plex Mono'";

// 비교 대상 색: 선택 "순서"대로 배정하는 서로 다른 세 색 — id 기반 색은 세 가지가 순환이라
// 두 사람이 같은 색을 받아 차트에서 구분이 안 되는 경우가 있었다.
const COMPARE_COLORS = [
  { color:"#7DD3FC", glowC:"125,211,252" },
  { color:"#FBBF24", glowC:"251,191,36"  },
  { color:"#A78BFA", glowC:"167,139,250" },
];

function centerMessage(text: string, spinning=false) {
  return (
    <div style={{ position:"relative", height:"100%" }}>
      <SpaceBackground/>
      <div style={{ position:"relative", zIndex:1, height:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        {spinning && <RefreshCw size={16} style={{ color:SPACE.accentSky, animation:"spin 1s linear infinite" }}/>}
        <span style={{ color:SPACE.textDim, fontFamily:FONT_BODY, fontSize:13 }}>{text}</span>
      </div>
    </div>
  );
}

// ─── Compare Screen ───────────────────────────────────────────────────────────
export function CompareScreen() {
  const isMobile = useIsMobile();
  const [cards, setCards] = useState<User[]|null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(()=>{
    listCards()
      .then(list=>setCards(list.map(cardToUser)))
      .catch(e=>setError(e instanceof ApiError ? e.message : "관측 데이터를 불러오지 못했습니다."));
  },[]);

  const locked = deriveEvaluationLocked(cards);
  function toggle(id:number){ if(locked) return; setSelected(p=>p.includes(id)?p.filter(x=>x!==id):p.length<3?[...p,id]:p); }

  // 선택 순서 = 색 배정 순서가 되도록 selected 배열 순서를 유지한다.
  const selUsers = selected
    .map(id=>(cards??[]).find(u=>u.id===id))
    .filter((u): u is User => !!u);
  const series = selUsers.map((u,i)=>({ name:u.name, color:COMPARE_COLORS[i].color, stats:u.stats }));

  if (error) return centerMessage(error);
  if (!cards) return centerMessage("관측 기록을 불러오는 중...", true);

  return (
    <div style={{ position:"relative", height:"100%", overflowY:"auto" }}>
      <SpaceBackground/>
      <div style={{ position:"relative", zIndex:1, padding: isMobile ? "22px 16px 34px" : "36px 40px 48px", minHeight:"100%", boxSizing:"border-box" }}>
        <div style={{ marginBottom:26 }}>
          <div style={{ fontFamily:FONT_HUD, fontSize:10, letterSpacing:"3px", color:SPACE.label, textTransform:"uppercase", marginBottom:6 }}>OBSERVATORY · COMPARATIVE ANALYSIS</div>
          <h1 style={{ fontFamily:FONT_DISPLAY, fontSize:26, fontWeight:500, color:SPACE.starWhite2, letterSpacing:"0.5px", margin:0 }}>스탯 비교</h1>
          <p style={{ margin:"6px 0 0", fontSize:12.5, fontWeight:300, lineHeight:1.7, color:SPACE.textDim, fontFamily:FONT_BODY }}>
            관측이 완료된 별들의 스펙트럼을 겹쳐 봅니다. 별을 2~3개 선택해 능력치를 나란히 비교하세요.
          </p>
        </div>

        {/* 별 선택기 */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:26, opacity:locked?0.4:1, pointerEvents:locked?"none":"auto" }}>
          {cards.map(u=>{
            const selIdx = selected.indexOf(u.id);
            const sel = selIdx >= 0;
            // 선택된 버튼만 배정된 비교 색을 띠고, 미선택은 중립 색 — 어떤 색이 누구인지 그대로 드러난다.
            const color = sel ? COMPARE_COLORS[selIdx].color : null;
            return (
              <button key={u.id} onClick={()=>toggle(u.id)} style={{
                display:"flex", alignItems:"center", gap:7, padding:"7px 13px", borderRadius:3, cursor:"pointer",
                background: color ? `${color}18` : "rgba(125,180,255,0.04)",
                border:`1px solid ${color ?? SPACE.border}`,
                transition:"all 0.15s",
              }}>
                <span style={{ fontSize:12, fontFamily:FONT_BODY, color:sel?SPACE.starWhite2:SPACE.textDim }}>{u.name}</span>
                {color && <Check size={11} style={{ color }}/>}
              </button>
            );
          })}
        </div>

        {locked ? (
          <HoloPanel style={{ maxWidth:420, display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"32px 24px" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(167,139,250,.12)", border:"1px solid rgba(167,139,250,.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Lock size={18} style={{ color:SPACE.accentPurple }}/>
            </div>
            <p style={{ fontSize:12.5, color:SPACE.textDim, fontFamily:FONT_BODY, textAlign:"center", margin:0 }}>
              아직 관측되지 않은 영역입니다.<br/>팀원 평가를 완료하면 비교 기능을 사용할 수 있습니다.
            </p>
          </HoloPanel>
        ) : selUsers.length < 2 ? (
          <HoloPanel style={{ maxWidth:480, display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"40px 24px" }}>
            <div style={{ width:60, height:60, borderRadius:"50%", border:`1px dashed ${SPACE.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:SPACE.accentSky, boxShadow:`0 0 8px ${SPACE.accentSky}` }}/>
            </div>
            <p style={{ fontSize:13, color:SPACE.textDim, fontFamily:FONT_BODY, textAlign:"center", margin:0 }}>비교할 별을 2~3개 선택해주세요</p>
          </HoloPanel>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
            {/* 선택된 별들 */}
            <div style={{ display:"flex", gap: isMobile ? 18 : 28, flexWrap:"wrap", justifyContent: isMobile ? "center" : "flex-start" }}>
              {selUsers.map((u,i)=>{
                const { color, glowC } = COMPARE_COLORS[i];
                return (
                  <div key={u.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                    <StarPortrait photo={u.photo} size={84} glowColor={color} glowC={glowC}/>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"2px", color:SPACE.label }}>{observatoryCode(u.id)}</div>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:500, color:SPACE.starWhite, marginTop:2 }}>{u.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <HoloPanel>
              <HudLabel en="SPECTRAL COMPARISON" kr="능력치 비교"/>
              <div style={{ display:"flex", justifyContent:"center" }}>
                <ConstellationChart series={series} size={isMobile ? 236 : 300}/>
              </div>
            </HoloPanel>

            <HoloPanel style={{ overflowX:"auto" }}>
              <HudLabel en="STAT BREAKDOWN" kr="세부 수치"/>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, fontFamily:FONT_BODY }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:"left", padding:"7px 10px", color:SPACE.label, fontWeight:400, fontFamily:FONT_HUD, fontSize:10, letterSpacing:"1.5px" }}>TRAIT</th>
                    {selUsers.map((u,i)=>(
                      <th key={u.id} style={{ textAlign:"center", padding:"7px 10px", color:COMPARE_COLORS[i].color, fontWeight:600 }}>{u.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STATS.map(s=>{
                    const vals = selUsers.map(u=>u.stats[s.key as keyof Stats]);
                    const mx = Math.max(...vals);
                    return (
                      <tr key={s.key} style={{ borderTop:`1px solid ${SPACE.border}` }}>
                        <td style={{ padding:"9px 10px" }}>
                          <InfoTooltip text={s.desc}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <s.Icon size={11} style={{ color:s.color }}/>
                              <span style={{ color:SPACE.textDim }}>{s.label}</span>
                            </div>
                          </InfoTooltip>
                        </td>
                        {vals.map((v,i)=>{
                          const uColor = COMPARE_COLORS[i].color;
                          return (
                            <td key={i} style={{ textAlign:"center", padding:"9px 10px", color:v===mx?uColor:SPACE.textDim, fontFamily:FONT_HUD, fontWeight:v===mx?600:400 }}>
                              {v}{v===mx?" ✦":""}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </HoloPanel>
          </div>
        )}
      </div>
    </div>
  );
}
