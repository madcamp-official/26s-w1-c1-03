import { useState, useEffect } from "react";
import { BarChart2, RefreshCw } from "lucide-react";
import { listCards, ApiError } from "../../api";
import type { Stats, User } from "../../types";
import { STATS } from "../../constants/stats";
import { RARITY } from "../../constants/rarity";
import { cardToUser, deriveEvaluationLocked } from "../../lib/cardMapping";
import { handleImgError } from "../../lib/avatar";
import { DS } from "../../design-system/tokens";
import { InfoTooltip } from "../../design-system/primitives";
import { BigHex } from "../../design-system/HexChart";
import { FlipCard } from "../../components/Card";

// ─── Compare Screen ───────────────────────────────────────────────────────────
export function CompareScreen() {
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
