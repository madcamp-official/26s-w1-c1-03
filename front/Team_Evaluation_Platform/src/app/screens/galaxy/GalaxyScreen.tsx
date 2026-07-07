import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { RefreshCw, Lock, X } from "lucide-react";
import { listCards, getCard, ApiError } from "../../api";
import type { User } from "../../types";
import { cardToUser, topTitles } from "../../lib/cardMapping";
import { starLayoutFor } from "../../lib/starLayout";
import { SPACE } from "../../design-system/space";
import { SpaceBackground } from "../../design-system/SpaceBackground";
import { HoloPanel } from "../../design-system/HoloPanel";
import { HudLabel } from "../../design-system/HudLabel";
import { StarPortrait } from "../../design-system/StarPortrait";
import { ConstellationChart } from "../../design-system/ConstellationChart";
import { RepresentativeTitle, TitleFragment } from "../../design-system/TitleFragment";

const FONT_BODY = "'Noto Sans KR'";
const FONT_DISPLAY = "'Space Grotesk'";
const FONT_HUD = "'IBM Plex Mono'";

const MIN_SCALE = 0.55, MAX_SCALE = 2.8, LOCK_SCALE = 2;

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

// design.md §68-78: 팀원 전체가 산개한 별로 떠 있는 은하 화면. 자유 팬/줌으로 탐험하다가
// 별을 클릭하면 TARGET LOCK → 카메라 딥줌 → 우측 관측 패널이 뜬다.
export function GalaxyScreen({ onEval }: { onEval:()=>void }) {
  const [cards, setCards] = useState<User[]|null>(null);
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState({ x:0, y:0, scale:1 });
  const [camTransition, setCamTransition] = useState("none");
  const dragRef = useRef<{ x:number; y:number; vx:number; vy:number; dragged:boolean } | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoverId, setHoverId] = useState<number|null>(null);
  const [selId, setSelId] = useState<number|null>(null);
  const [lockStage, setLockStage] = useState<0|1|2>(0);
  const [detail, setDetail] = useState<User|null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [clock, setClock] = useState("");

  useEffect(()=>{
    listCards()
      .then(list=>setCards(list.map(cardToUser)))
      .catch(e=>setError(e instanceof ApiError ? e.message : "관측 데이터를 불러오지 못했습니다."));
  },[]);

  useEffect(()=>{
    const iv = setInterval(()=>{
      const d = new Date();
      const p = (n:number)=>String(n).padStart(2,"0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    }, 1000);
    return ()=>clearInterval(iv);
  },[]);

  const stars = useMemo(()=>{
    if (!cards) return [];
    return cards.map((u,i)=>({ user:u, layout: starLayoutFor(u.id, i, cards.length) }));
  },[cards]);

  const selStar = stars.find(s=>s.user.id===selId) ?? null;
  const locked = selId!==null && lockStage>=2;

  // ── free pan/zoom (선택된 별이 없을 때만) ──────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (selId!==null) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    setView(v=>{
      const s1 = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * Math.exp(-e.deltaY * 0.0012)));
      const k = s1 / v.scale;
      setCamTransition("none");
      return { scale:s1, x: px - (px - v.x)*k, y: py - (py - v.y)*k };
    });
  },[selId]);

  function onMouseDown(e: React.MouseEvent) {
    if (selId!==null) return;
    dragRef.current = { x:e.clientX, y:e.clientY, vx:view.x, vy:view.y, dragged:false };
  }
  function onMouseMove(e: React.MouseEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) d.dragged = true;
    if (d.dragged) { setCamTransition("none"); setView({ scale:view.scale, x:d.vx+dx, y:d.vy+dy }); }
  }
  function onMouseUp() {
    if (dragRef.current) setTimeout(()=>{ dragRef.current = null; }, 0);
  }
  function resetView() {
    if (selId!==null) return;
    setCamTransition("transform .9s cubic-bezier(.25,.9,.25,1)");
    setView({ x:0, y:0, scale:1 });
  }

  function selectStar(u: User) {
    if (selId===u.id || dragRef.current?.dragged) return;
    setSelId(u.id); setLockStage(1); setDetail(null); setDetailError("");
    const t = setTimeout(()=>{ setLockStage(2); setCamTransition("transform 1.4s cubic-bezier(.25,.9,.25,1)"); }, 750);
    lockTimerRef.current = t;
  }
  function backToGalaxy() {
    if (lockTimerRef.current) { clearTimeout(lockTimerRef.current); lockTimerRef.current = null; }
    setSelId(null); setLockStage(0); setDetail(null);
    setCamTransition("transform 1.4s cubic-bezier(.25,.9,.25,1)");
  }

  useEffect(()=>()=>{ if (lockTimerRef.current) clearTimeout(lockTimerRef.current); },[]);

  // Esc로도 언제든 은하 화면으로 돌아갈 수 있게 — 패널/애니메이션 상태와 무관한 별도 탈출구.
  useEffect(()=>{
    if (selId===null) return;
    function onKey(e: KeyboardEvent) { if (e.key==="Escape") backToGalaxy(); }
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[selId]);

  useEffect(()=>{
    if (selId===null) return;
    setDetailLoading(true);
    getCard(selId)
      .then(d=>setDetail(cardToUser(d)))
      .catch(e=>setDetailError(e instanceof ApiError ? e.message : "관측 데이터를 불러오지 못했습니다."))
      .finally(()=>setDetailLoading(false));
  },[selId]);

  if (error) return centerMessage(error);
  if (!cards) return centerMessage("은하를 스캔하는 중...", true);

  // camera transform: 선택한 별을 화면 정중앙으로 딥줌, 아니면 자유 팬/줌 좌표 사용.
  //
  // 락온 케이스는 컨테이너의 px 크기를 전혀 재지 않고 전부 %로 계산한다 — transform-origin을
  // "그 별 자신의 위치(%)"로 두면, transform-origin 알고리즘(P' = O + M*(P-O))에 의해
  // 그 별 자신(P=O)은 항상 O + (tx,ty)로 이동한다. 즉 tx=목표% - 별의 원래 %, ty도 동일하게
  // 잡으면 컨테이너 실측 크기(px)와 무관하게 정확히 그 별이 목표 위치(%)로 온다.
  // (이전엔 getBoundingClientRect/ResizeObserver로 잰 px 크기로 직접 translate px를 계산했는데,
  // 그 측정치가 실제 world div 크기와 어긋나면 완전히 엉뚱한 곳으로 튀는 문제가 있었다.)
  let camTransform: string;
  let camOrigin: string;
  if (locked && selStar) {
    const sxPct = parseFloat(selStar.layout.left);
    const syPct = parseFloat(selStar.layout.top);
    const targetXPct = 50, targetYPct = 50;
    camOrigin = `${sxPct}% ${syPct}%`;
    camTransform = `translate(${targetXPct - sxPct}%, ${targetYPct - syPct}%) scale(${LOCK_SCALE})`;
  } else {
    camOrigin = "0 0";
    camTransform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  }

  // 패널은 카메라 줌 완료(lockStage 2)를 기다리지 않고 별을 고른 즉시 뜬다 — 그래야
  // "되돌아갈 방법이 없다"고 느껴질 여지가 없다. 카메라 연출은 독립적으로 진행된다.
  const showPanel = selId!==null && selStar;
  const panelUser = detail ?? selStar?.user ?? null;
  const panelUnlocked = panelUser?.isUnlocked ?? false;
  const repTitle = panelUser ? topTitles(panelUser.titleVotes)[0] : undefined;

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDoubleClick={resetView}
      onClick={()=>{ if (selId!==null && !dragRef.current?.dragged) backToGalaxy(); }}
      style={{ position:"relative", height:"100%", overflow:"hidden", cursor: selId===null ? "grab" : "default" }}
    >
      <SpaceBackground/>

      {/* world: 별들이 놓이는 좌표계. transform-origin이 위에서 계산한 camOrigin과 항상 짝이어야 한다. */}
      <div style={{ position:"absolute", inset:0, transformOrigin:camOrigin, transform:camTransform, transition:camTransition }}>
        {stars.map(({ user, layout })=>{
          const hovered = hoverId===user.id, isSel = selId===user.id;
          const emphasize = hovered || isSel;
          const haloSize = layout.size * 4.5;
          return (
            <div
              key={user.id}
              onMouseEnter={()=>setHoverId(user.id)}
              onMouseLeave={()=>setHoverId(null)}
              onClick={(e)=>{ e.stopPropagation(); selectStar(user); }}
              style={{
                position:"absolute", left:layout.left, top:layout.top,
                transform:"translate(-50%,-50%)",
                opacity: selId!==null && !isSel ? 0.22 : 1,
                transition:"opacity .6s ease",
                cursor:"pointer",
              }}
            >
              {/* halo */}
              <div style={{
                position:"absolute", left:"50%", top:"50%", width:haloSize, height:haloSize,
                transform:"translate(-50%,-50%)", borderRadius:"50%",
                background:`radial-gradient(circle, rgba(${layout.glowC},.35), transparent 70%)`,
                opacity: emphasize ? 1 : 0, transition:"opacity .4s ease", pointerEvents:"none",
              }}/>
              {/* target lock pulse (선택 직후 잠깐) */}
              {isSel && lockStage===1 && (
                <div style={{
                  position:"absolute", left:"50%", top:"50%", width:layout.size*2.4, height:layout.size*2.4,
                  marginLeft:-layout.size*1.2, marginTop:-layout.size*1.2, borderRadius:"50%",
                  border:`1.5px dashed ${SPACE.accentTeal}`, animation:"targetPulse .75s ease-out",
                }}/>
              )}
              {/* star core */}
              <div style={{
                width:layout.size, height:layout.size, borderRadius:"50%",
                background:`radial-gradient(circle at 40% 35%, #ffffff, ${layout.color} 60%)`,
                boxShadow: emphasize
                  ? `0 0 ${layout.size}px ${layout.size/2.2}px rgba(${layout.glowC},.9), 0 0 ${layout.size*3}px ${layout.size}px rgba(${layout.glowC},.45)`
                  : `0 0 ${layout.size*0.7}px ${layout.size/3}px rgba(${layout.glowC},.7), 0 0 ${layout.size*2}px ${layout.size/1.6}px rgba(${layout.glowC},.3)`,
                animation:`starBreathe ${layout.breathe} ease-in-out infinite`,
              }}/>
              {/* label */}
              <div style={{
                position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)", marginTop:6,
                whiteSpace:"nowrap", textAlign:"center", opacity: emphasize?1:0, transition:"opacity .3s ease", pointerEvents:"none",
              }}>
                <div style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"1.5px", color:SPACE.accentTeal }}>MDM-{String(user.id).padStart(3,"0")}</div>
                <div style={{ fontFamily:FONT_BODY, fontSize:11, color:SPACE.starWhite2, marginTop:1 }}>{user.name}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── HUD 네 모서리 ── */}
      <div style={{ position:"absolute", top:20, left:24, zIndex:2, pointerEvents:"none" }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, letterSpacing:"6px", color:SPACE.starWhite2 }}>MADMON</div>
        <div style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"2px", color:SPACE.label, marginTop:2 }}>DEEP-SKY OBSERVATORY</div>
      </div>
      <div style={{ position:"absolute", top:20, right:24, zIndex:2, pointerEvents:"none", textAlign:"right" }}>
        <div style={{ fontFamily:FONT_HUD, fontSize:10, letterSpacing:"2px", color:SPACE.accentSky }}>GALAXY</div>
        <div style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"1.5px", color:SPACE.label, marginTop:2 }}>{cards.length} MEMBERS</div>
      </div>
      <div style={{ position:"absolute", bottom:18, left:24, zIndex:2, pointerEvents:"none" }}>
        <div style={{ fontFamily:FONT_HUD, fontSize:10, letterSpacing:"1.5px", color:SPACE.accentTeal }}>{cards.length} STARS DETECTED</div>
        <div style={{ fontFamily:FONT_BODY, fontSize:10.5, color:SPACE.label, marginTop:2 }}>
          {selId===null ? "드래그로 이동 · 휠로 확대 · 별 클릭으로 관측" : "빈 공간 클릭 또는 Esc로 은하로 돌아가기"}
        </div>
      </div>
      <div style={{ position:"absolute", bottom:18, right:24, zIndex:2, pointerEvents:"none", textAlign:"right" }}>
        <div style={{ fontFamily:FONT_HUD, fontSize:10, color:SPACE.label }}>ZOOM ×{(locked?LOCK_SCALE:view.scale).toFixed(1)}</div>
        <div style={{ fontFamily:FONT_HUD, fontSize:10, color:SPACE.faint, marginTop:2 }}>{clock} KST</div>
      </div>

      {/* 화면 어디를 눌러도(패널 안 제외) 돌아갈 수 있지만, 그것만으로는 눈에 안 띄어서
          항상 보이는 닫기 버튼도 별도로 둔다 — 패널/카메라 애니메이션 상태와 무관하게 동작. */}
      {selId!==null && (
        <button
          onClick={(e)=>{ e.stopPropagation(); backToGalaxy(); }}
          title="은하로 돌아가기 (Esc)"
          style={{
            position:"absolute", top:64, right:24, zIndex:4,
            width:32, height:32, borderRadius:"50%", cursor:"pointer",
            background:"rgba(2,6,23,0.6)", border:`1px solid ${SPACE.borderStrong}`,
            display:"flex", alignItems:"center", justifyContent:"center", color:SPACE.accentSky,
          }}
        ><X size={15}/></button>
      )}

      {/* ── 관측 패널 ── */}
      {showPanel && panelUser && (
        <div
          onClick={e=>e.stopPropagation()}
          style={{ position:"absolute", top:0, right:0, bottom:0, width:340, padding:20, zIndex:3, display:"flex", alignItems:"center" }}
        >
          <HoloPanel style={{ width:"100%", maxHeight:"calc(100% - 40px)", overflowY:"auto", animation:"slideInPanel .85s cubic-bezier(.25,.9,.25,1) both" }}>
            <button
              onClick={backToGalaxy}
              style={{ background:"none", border:"none", cursor:"pointer", padding:0, marginBottom:16, display:"flex", alignItems:"center", gap:6, fontFamily:FONT_HUD, fontSize:10, letterSpacing:"1.5px", color:SPACE.accentSky }}
            >◂ RETURN TO GALAXY</button>

            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
              <StarPortrait photo={panelUser.photo} size={104}/>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:FONT_HUD, fontSize:10, letterSpacing:"2px", color:SPACE.label }}>MDM-{String(panelUser.id).padStart(3,"0")}</div>
                <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:500, color:SPACE.starWhite, margin:"4px 0 0" }}>{panelUser.name}</h2>
                {panelUnlocked && repTitle && <div style={{ marginTop:6 }}><RepresentativeTitle label={repTitle}/></div>}
              </div>

              {detailLoading && <RefreshCw size={16} style={{ color:SPACE.accentSky, animation:"spin 1s linear infinite" }}/>}
              {detailError && <span style={{ fontSize:11, color:"#f87171", fontFamily:FONT_BODY }}>{detailError}</span>}

              {!panelUnlocked ? (
                <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"18px 6px", borderTop:`1px solid ${SPACE.border}` }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(167,139,250,.12)", border:"1px solid rgba(167,139,250,.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Lock size={18} style={{ color:SPACE.accentPurple }}/>
                  </div>
                  <p style={{ fontSize:12, color:SPACE.textDim, fontFamily:FONT_BODY, textAlign:"center", margin:0 }}>
                    아직 관측되지 않은 영역입니다.<br/>팀원 평가를 완료하면 스펙트럼을 확인할 수 있습니다.
                  </p>
                  <button
                    onClick={onEval}
                    style={{ padding:"9px 20px", borderRadius:3, border:"none", cursor:"pointer", background:SPACE.buttonGradient, color:SPACE.bgDeep, fontFamily:FONT_HUD, fontSize:10.5, letterSpacing:"2px", fontWeight:500 }}
                  >⌁ OBSERVE</button>
                </div>
              ) : (
                <>
                  {panelUser.bio && <p style={{ fontSize:12, color:SPACE.textDim, fontFamily:FONT_BODY, fontStyle:"italic", textAlign:"center", margin:0 }}>"{panelUser.bio}"</p>}
                  <div style={{ width:"100%" }}>
                    <HudLabel en="SPECTRAL ANALYSIS" kr="능력치 분석"/>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      <ConstellationChart stats={panelUser.stats} size={230}/>
                    </div>
                  </div>
                  <div style={{ width:"100%" }}>
                    <HudLabel en="CONSTELLATION FRAGMENTS" kr="획득 칭호"/>
                    {panelUser.titleVotes.length===0 ? (
                      <p style={{ fontSize:12, color:SPACE.label, fontFamily:FONT_BODY }}>아직 획득한 칭호가 없습니다.</p>
                    ) : (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {panelUser.titleVotes.map(tv=>(
                          <TitleFragment key={tv.title} label={tv.title} votes={tv.votes}/>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </HoloPanel>
        </div>
      )}
    </div>
  );
}
