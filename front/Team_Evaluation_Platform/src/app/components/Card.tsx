import { useState } from "react";
import { Lock } from "lucide-react";
import { RARITY } from "../constants/rarity";
import { STATS } from "../constants/stats";
import type { Stats, User } from "../types";
import { topTitles, totalPower } from "../lib/cardMapping";
import { FALLBACK_AVATAR, handleImgError } from "../lib/avatar";
import { Btn, Pill, InfoTooltip } from "../design-system/primitives";
import { MiniHex, BigHex } from "../design-system/HexChart";

// ─── Card Components ──────────────────────────────────────────────────────────
export function CardFront({ user }: { user:User }) {
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

export function CardBack({ user, hexSize=170 }: { user:User; hexSize?:number }) {
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

export function FlipCard({ user, w=200, h=320, locked=false, onUnlock, hexSize, flippable=true }: { user:User; w?:number; h?:number; locked?:boolean; onUnlock?:()=>void; hexSize?:number; flippable?:boolean }) {
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

export function GridCard({ user, onClick, locked=false }: { user:User; onClick:()=>void; locked?:boolean }) {
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
