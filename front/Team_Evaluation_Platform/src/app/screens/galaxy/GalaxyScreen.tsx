import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { RefreshCw, Lock, Search, X } from "lucide-react";
import { listStars, getStar, listMyTeams, getTeam, ApiError } from "../../api";
import type { User } from "../../types";
import { starToUser, topTitles } from "../../lib/starMapping";
import { brightnessOf, gradeForStats, gradeForBrightness, spectrumPct, surfaceTempOf } from "../../lib/brightness";
import { starAppearanceFor, galaxyPositions, teamLineColorFor } from "../../lib/starLayout";
import type { TeamCluster } from "../../lib/starLayout";
import { useIsMobile } from "../../lib/useIsMobile";
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
  const [stars, setStars] = useState<User[]|null>(null);
  const [error, setError] = useState("");
  // null = 아직 로딩 중. 팀 정보를 못 가져와도([]) 은하 자체는 무소속 배치로 동작한다.
  const [teams, setTeams] = useState<TeamCluster[]|null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  // 닫을 때도 열릴 때처럼 슬라이드로 — 퇴장 애니메이션이 끝난 뒤 언마운트한다.
  const [searchClosing, setSearchClosing] = useState(false);
  const searchCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");

  function toggleSearch() {
    if (searchOpen && !searchClosing) {
      setSearchClosing(true);
      searchCloseTimer.current = setTimeout(()=>{ setSearchOpen(false); setSearchClosing(false); }, 380);
    } else if (!searchOpen) {
      if (searchCloseTimer.current) clearTimeout(searchCloseTimer.current);
      setSearchClosing(false);
      setSearchOpen(true);
    }
  }
  useEffect(()=>()=>{ if (searchCloseTimer.current) clearTimeout(searchCloseTimer.current); },[]);

  const containerRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState({ x:0, y:0, scale:1 });
  const [camTransition, setCamTransition] = useState("none");
  const dragRef = useRef<{ x:number; y:number; vx:number; vy:number; dragged:boolean } | null>(null);
  // 터치 제스처: 한 손가락 = 팬, 두 손가락 = 핀치 줌. 마우스 팬/휠 줌과 같은 카메라를 움직인다.
  const touchRef = useRef<
    | { mode:"pan"; x:number; y:number; vx:number; vy:number }
    | { mode:"pinch"; d0:number; px:number; py:number; v:{ x:number; y:number; scale:number } }
    | null
  >(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();

  const [hoverId, setHoverId] = useState<number|null>(null);
  const [selId, setSelId] = useState<number|null>(null);
  const [lockStage, setLockStage] = useState<0|1|2>(0);
  const [detail, setDetail] = useState<User|null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [clock, setClock] = useState("");

  useEffect(()=>{
    listStars()
      .then(list=>setStars(list.map(starToUser)))
      .catch(e=>setError(e instanceof ApiError ? e.message : "관측 데이터를 불러오지 못했습니다."));
  },[]);

  // 내가 속한 팀 중 마감(projectDeadline)이 지나지 않은 팀만 클러스터/별자리 선의 대상이다.
  // 평가 완료 여부와는 무관하며, 기한이 끝난 팀은 묶지 않는다.
  useEffect(()=>{
    listMyTeams()
      .then(async list=>{
        const now = Date.now();
        const active = list.filter(t=>new Date(t.projectDeadline).getTime() > now);
        const details = await Promise.all(active.map(t=>getTeam(t.id).catch(()=>null)));
        setTeams(details
          .filter((d): d is NonNullable<typeof d> => d!==null)
          .map(d=>({ id:d.team.id, name:d.team.name, memberIds:d.members.map(m=>m.userId) })));
      })
      .catch(()=>setTeams([]));
  },[]);

  useEffect(()=>{
    const iv = setInterval(()=>{
      const d = new Date();
      const p = (n:number)=>String(n).padStart(2,"0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    }, 1000);
    return ()=>clearInterval(iv);
  },[]);

  // 색 배정(teamLineColorFor)과 배치(galaxyPositions)가 같은 순서를 보게 id로 정렬해 공유한다.
  const sortedTeams = useMemo(()=> teams ? [...teams].sort((a,b)=>a.id-b.id) : [], [teams]);

  const starMarkers = useMemo(()=>{
    if (!stars) return [];
    const pos = galaxyPositions(stars.map(u=>u.id), sortedTeams);
    return stars.map(u=>{
      const p = pos.get(u.id)!;
      // 밝기 등급 색(청/백/황/적) — 잠긴 별은 능력치를 모르므로 기존 id 기반 색으로 둔다.
      const grade = u.isUnlocked ? gradeForStats(u.stats) : null;
      return {
        user: u, x: p.x, y: p.y,
        layout: { ...starAppearanceFor(u.id, grade ?? undefined), left:`${p.x.toFixed(2)}%`, top:`${p.y.toFixed(2)}%` },
      };
    });
  },[stars, sortedTeams]);

  // 팀 별자리 선: 같은 팀 멤버의 모든 쌍을 그 팀 색의 연한 점선으로 잇는다.
  // 여러 팀에 속한 사람은 팀마다 선이 그려지므로 자연히 모든 소속 팀과 연결된다.
  const teamLines = useMemo(()=>{
    const byId = new Map(starMarkers.map(s=>[s.user.id, s]));
    return sortedTeams.map((t,k)=>{
      const pts = [...new Set(t.memberIds)]
        .map(id=>byId.get(id))
        .filter((s): s is NonNullable<typeof s> => !!s);
      const segs: { x1:number; y1:number; x2:number; y2:number }[] = [];
      for (let i=0;i<pts.length;i++)
        for (let j=i+1;j<pts.length;j++)
          segs.push({ x1:pts[i].x, y1:pts[i].y, x2:pts[j].x, y2:pts[j].y });
      return { id:t.id, name:t.name, ...teamLineColorFor(k), segs };
    });
  },[sortedTeams, starMarkers]);

  // userId → 소속 팀 인덱스 목록(명단에서 팀 색 표시용).
  const teamsByUser = useMemo(()=>{
    const map = new Map<number, number[]>();
    sortedTeams.forEach((t,k)=>t.memberIds.forEach(id=>{
      const l = map.get(id) ?? []; l.push(k); map.set(id, l);
    }));
    return map;
  },[sortedTeams]);

  // 검색: 부분 일치("홍"→홍길동·홍준표, "홍길"→홍길동). 비우면 전체 명단.
  const roster = useMemo(()=>{
    const q = query.trim().toLowerCase();
    const list = q ? starMarkers.filter(s=>s.user.name.toLowerCase().includes(q)) : starMarkers;
    return [...list].sort((a,b)=>a.user.name.localeCompare(b.user.name, "ko"));
  },[starMarkers, query]);

  const selStar = starMarkers.find(s=>s.user.id===selId) ?? null;
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

  // ── touch pan/pinch (컨테이너 touchAction:none과 짝 — 브라우저 스크롤/줌을 끄고 직접 처리) ──
  function onTouchStart(e: React.TouchEvent) {
    if (selId!==null) return;
    if (e.touches.length===1) {
      const t = e.touches[0];
      touchRef.current = { mode:"pan", x:t.clientX, y:t.clientY, vx:view.x, vy:view.y };
    } else if (e.touches.length>=2) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const [a,b] = [e.touches[0], e.touches[1]];
      touchRef.current = {
        mode:"pinch",
        d0: Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY),
        px: (a.clientX+b.clientX)/2 - rect.left,
        py: (a.clientY+b.clientY)/2 - rect.top,
        v: view,
      };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    const t0 = touchRef.current;
    if (!t0 || selId!==null) return;
    if (t0.mode==="pan" && e.touches.length===1) {
      const t = e.touches[0];
      setCamTransition("none");
      setView({ scale:view.scale, x:t0.vx + (t.clientX-t0.x), y:t0.vy + (t.clientY-t0.y) });
    } else if (t0.mode==="pinch" && e.touches.length>=2) {
      const [a,b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
      if (t0.d0 <= 0) return;
      const s1 = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t0.v.scale * (d/t0.d0)));
      const k = s1 / t0.v.scale;
      setCamTransition("none");
      // 휠 줌과 같은 식: 두 손가락의 중점을 고정점 삼아 확대/축소한다.
      setView({ scale:s1, x: t0.px - (t0.px - t0.v.x)*k, y: t0.py - (t0.py - t0.v.y)*k });
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length===0) { touchRef.current = null; return; }
    // 핀치 중 손가락 하나를 떼면 남은 손가락 기준의 팬으로 자연스럽게 이어간다.
    const t = e.touches[0];
    touchRef.current = { mode:"pan", x:t.clientX, y:t.clientY, vx:view.x, vy:view.y };
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
    getStar(selId)
      .then(d=>setDetail(starToUser(d)))
      .catch(e=>setDetailError(e instanceof ApiError ? e.message : "관측 데이터를 불러오지 못했습니다."))
      .finally(()=>setDetailLoading(false));
  },[selId]);

  if (error) return centerMessage(error);
  // 팀 정보까지 기다렸다가 그린다 — 나중에 도착하면 별이 한 번 순간이동하는 것처럼 보인다.
  if (!stars || teams===null) return centerMessage("은하를 스캔하는 중...", true);

  // camera transform: 선택한 별을 화면 정중앙으로 딥줌, 아니면 자유 팬/줌 좌표 사용.
  //
  // transform-origin은 항상 "0 0" 고정이다 — origin이 "그 별의 %"였을 때는 줌인일 땐
  // 문제없지만, 되돌아갈 때(selId→null) origin이 그 프레임에 즉시 "0 0"으로 튀어버려서
  // transform 전환(1.4s)이 진행되는 동안 매 프레임이 잘못된 기준점으로 계산되고, 그 결과
  // "별에서 줄어드는 게 아니라 뜬금없는 지점에서 줄어드는" 것처럼 보였다. origin을 항상
  // 고정해두고, origin=(0,0)일 때의 식(P' = scale*P + translate)으로 목표%를 역산하면
  // (translate% = 목표% - scale*별의 원래%) 컨테이너 실측 크기와 무관하게 항상 정확하고,
  // 줌인·줌아웃 내내 같은 기준점을 쓰므로 전환도 항상 자연스럽다.
  let camTransform: string;
  if (locked && selStar) {
    const sxPct = parseFloat(selStar.layout.left);
    const syPct = parseFloat(selStar.layout.top);
    // 모바일은 하단 시트가 화면 아래쪽을 덮으므로 별을 위쪽 1/3 지점으로 데려온다.
    const targetXPct = 50, targetYPct = isMobile ? 30 : 50;
    camTransform = `translate(${targetXPct - LOCK_SCALE*sxPct}%, ${targetYPct - LOCK_SCALE*syPct}%) scale(${LOCK_SCALE})`;
  } else {
    camTransform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  }

  // 패널은 카메라 줌 완료(lockStage 2)를 기다리지 않고 별을 고른 즉시 뜬다 — 그래야
  // "되돌아갈 방법이 없다"고 느껴질 여지가 없다. 카메라 연출은 독립적으로 진행된다.
  const showPanel = selId!==null && selStar;
  const panelUser = detail ?? selStar?.user ?? null;
  const panelUnlocked = panelUser?.isUnlocked ?? false;
  const repTitle = panelUser ? topTitles(panelUser.titleVotes)[0] : undefined;
  const panelGrade = panelUnlocked && panelUser ? gradeForStats(panelUser.stats) : null;

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onDoubleClick={resetView}
      onClick={()=>{ if (selId!==null && !dragRef.current?.dragged) backToGalaxy(); }}
      style={{ position:"relative", height:"100%", overflow:"hidden", cursor: selId===null ? "grab" : "default", touchAction:"none" }}
    >
      <style>{`
        @keyframes slideInPanelL { from{opacity:0;transform:translateX(-48px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideOutPanelL { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-48px)} }
        @keyframes slideInPanelUp { from{opacity:0;transform:translateY(48px)} to{opacity:1;transform:translateY(0)} }
        .gx-search{background:rgba(125,180,255,.05);border:1px solid rgba(125,180,255,.16);border-radius:2px;color:#eef4ff;outline:none;font-family:'Noto Sans KR',sans-serif;font-weight:300;transition:border-color .25s,box-shadow .25s}
        .gx-search::placeholder{color:#3d4f70}
        .gx-search:focus{border-color:rgba(125,211,252,.55);box-shadow:0 0 14px rgba(125,211,252,.12)}
        .gx-row:hover{background:rgba(125,180,255,.08)!important}
      `}</style>
      {/* 배경이 카메라 팬/줌을 살짝 따라가는 패럴랙스 — 전경의 15%만 따라가게 감쇠해서
          "화면이 통째로 고정된" 느낌 없이 은은한 원근감을 준다. 락온 중엔 view가 그대로
          유지되므로 자연스럽게 그 시점에서 멈춘다. */}
      <SpaceBackground driftX={view.x*0.15} driftY={view.y*0.15} driftScale={view.scale}/>

      {/* world: 별들이 놓이는 좌표계. transform-origin은 항상 0 0(위 camTransform 계산과 짝). */}
      <div style={{ position:"absolute", inset:0, transformOrigin:"0 0", transform:camTransform, transition:camTransition }}>
        {/* 팀 별자리 선 — 별과 같은 % 좌표계의 SVG. 별을 선택하면 별들처럼 어두워진다. */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
          position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none",
          opacity: selId!==null ? 0.15 : 1, transition:"opacity .6s ease",
        }}>
          {teamLines.map(t=>t.segs.map((s,i)=>(
            <line key={`${t.id}-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke={t.line} strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 5"/>
          )))}
        </svg>
        {starMarkers.map(({ user, layout })=>{
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
              {/* TARGET LOCK: design_example 실제 마크업 그대로(고정 110px 링 2개 + 텍스트),
                  별이 선택돼 있는 내내(확대된 뒤에도) 계속 돈다 — 잠깐 떴다 사라지는 게 아니다. */}
              {isSel && (
                <>
                  <div style={{
                    position:"absolute", left:"50%", top:"50%", width:110, height:110,
                    transform:"translate(-50%,-50%)", borderRadius:"50%",
                    border:"1px dashed rgba(94,234,212,.75)", animation:"spinSlowC 9s linear infinite",
                    pointerEvents:"none",
                  }}/>
                  <div style={{
                    position:"absolute", left:"50%", top:"50%", width:110, height:110,
                    transform:"translate(-50%,-50%)", borderRadius:"50%",
                    border:"1px solid rgba(94,234,212,.4)", animation:"pulseRing 1.6s ease-out infinite",
                    pointerEvents:"none",
                  }}/>
                  <div style={{
                    position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-84px)",
                    whiteSpace:"nowrap", fontFamily:FONT_HUD, fontSize:9, letterSpacing:"3px", color:"#5EEAD4",
                    animation:"fadeIn .5s both", pointerEvents:"none",
                  }}>TARGET LOCK</div>
                </>
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
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, letterSpacing:"6px", color:SPACE.starWhite2 }}>MADNOVA</div>
        <div style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"2px", color:SPACE.label, marginTop:2 }}>DEEP-SKY OBSERVATORY</div>
      </div>
      {/* 관측 패널(우측 340px)이 열리면 오른쪽 HUD가 가려지므로 패널 폭만큼 왼쪽으로 비켜준다 */}
      <div style={{ position:"absolute", top:20, right: !isMobile && showPanel ? 396 : 24, zIndex:2, pointerEvents:"none", textAlign:"right", transition:"right 1s cubic-bezier(.25,.9,.25,1)" }}>
        <div style={{ fontFamily:FONT_HUD, fontSize:10, letterSpacing:"2px", color:SPACE.accentSky }}>GALAXY</div>
        <div style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"1.5px", color:SPACE.label, marginTop:2 }}>{stars.length} MEMBERS</div>
        {/* 팀 별자리 색 범례 — 어떤 점선이 어느 팀인지 구분한다. */}
        {teamLines.length>0 && (
          <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
            {teamLines.map(t=>(
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontFamily:FONT_BODY, fontSize:10, color:SPACE.textDim }}>{t.name}</span>
                <span style={{ width:22, borderTop:`1px dashed ${t.solid}`, opacity:.8 }}/>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position:"absolute", bottom:18, left:24, zIndex:2, pointerEvents:"none",
        opacity: isMobile && showPanel ? 0 : 1, transition:"opacity .5s ease" }}>
        {/* 별 수는 우상단 N MEMBERS가 이미 보여주므로 여기엔 조작 안내만 둔다 */}
        <div style={{ fontFamily:FONT_BODY, fontSize:10.5, color:SPACE.label, marginTop:2 }}>
          {selId===null
            ? (isMobile ? "드래그로 이동 · 핀치로 확대 · 별을 터치해 관측" : "드래그로 이동 · 휠로 확대 · 별 클릭으로 관측")
            : (isMobile ? "빈 공간을 터치해 은하로 돌아가기" : "빈 공간 클릭 또는 Esc로 은하로 돌아가기")}
        </div>
      </div>
      <div style={{ position:"absolute", bottom:18, right: !isMobile && showPanel ? 396 : 24, zIndex:2, pointerEvents:"none", textAlign:"right",
        opacity: isMobile && showPanel ? 0 : 1, transition:"right 1s cubic-bezier(.25,.9,.25,1), opacity .5s ease" }}>
        <div style={{ fontFamily:FONT_HUD, fontSize:10, color:SPACE.label }}>ZOOM ×{(locked?LOCK_SCALE:view.scale).toFixed(1)}</div>
        <div style={{ fontFamily:FONT_HUD, fontSize:10, color:SPACE.faint, marginTop:2 }}>{clock} KST</div>
      </div>

      {/* ── 검색 버튼 (좌상단 로고 아래) ── */}
      <button
        onClick={e=>{ e.stopPropagation(); toggleSearch(); }}
        onMouseDown={e=>e.stopPropagation()}
        onDoubleClick={e=>e.stopPropagation()}
        onTouchStart={e=>e.stopPropagation()}
        style={{
          position:"absolute", top:64, left:24, zIndex:3,
          display:"flex", alignItems:"center", gap:7, padding:"7px 12px", borderRadius:3, cursor:"pointer",
          background:"rgba(8,17,38,.72)", backdropFilter:"blur(6px)",
          border:`1px solid ${searchOpen ? "rgba(94,234,212,.5)" : SPACE.border}`,
          fontFamily:FONT_HUD, fontSize:10, letterSpacing:"2px",
          color: searchOpen ? SPACE.accentTeal : SPACE.accentSky,
          transition:"color .2s, border-color .2s",
        }}
      >
        <Search size={11}/> SEARCH
        <span style={{ fontFamily:FONT_BODY, fontSize:10, letterSpacing:0, color:SPACE.label }}>검색</span>
      </button>

      {/* ── 관측 명단 패널 (검색) ── */}
      {searchOpen && (
        <div
          onClick={e=>e.stopPropagation()}
          onMouseDown={e=>e.stopPropagation()}
          onDoubleClick={e=>e.stopPropagation()}
          onWheel={e=>e.stopPropagation()}
          onTouchStart={e=>e.stopPropagation()}
          onTouchMove={e=>e.stopPropagation()}
          style={{ position:"absolute", top:102, left:24, width: isMobile ? "min(300px, calc(100vw - 48px))" : 266, zIndex:3, maxHeight:"calc(100% - 128px)", display:"flex", touchAction:"pan-y" }}
        >
          <HoloPanel style={{ width:"100%", display:"flex", flexDirection:"column", overflow:"hidden", padding:"16px 16px 12px",
            animation: searchClosing ? "slideOutPanelL .38s cubic-bezier(.4,0,.6,1) both" : "slideInPanelL .7s cubic-bezier(.25,.9,.25,1) both" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontFamily:FONT_HUD, fontSize:10, letterSpacing:"3px", color:SPACE.accentSky }}>STAR INDEX</span>
                <span style={{ fontFamily:FONT_BODY, fontSize:11, color:SPACE.label }}>관측 명단</span>
              </div>
              <button onClick={toggleSearch} style={{ background:"none", border:"none", cursor:"pointer", color:SPACE.label, padding:2, display:"flex" }}>
                <X size={12}/>
              </button>
            </div>
            <input
              className="gx-search"
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="이름으로 검색…"
              autoFocus
              style={{ width:"100%", padding:"9px 11px", fontSize:12.5, boxSizing:"border-box" }}
            />
            <div style={{ marginTop:8, overflowY:"auto", display:"flex", flexDirection:"column", gap:1 }}>
              {roster.length===0 ? (
                <div style={{ padding:"14px 4px" }}>
                  <div style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"2px", color:SPACE.faint }}>NO SIGNAL</div>
                  <div style={{ fontFamily:FONT_BODY, fontSize:11, color:SPACE.label, marginTop:3 }}>일치하는 별이 없습니다.</div>
                </div>
              ) : roster.map(s=>{
                const isSel = selId===s.user.id;
                return (
                  <button
                    key={s.user.id}
                    className="gx-row"
                    onClick={()=>selectStar(s.user)}
                    style={{
                      display:"flex", alignItems:"center", gap:9, padding:"7px 8px", borderRadius:2,
                      border:"none", cursor:"pointer", textAlign:"left", width:"100%",
                      background: isSel ? "rgba(94,234,212,.08)" : "transparent",
                      transition:"background .15s",
                    }}
                  >
                    <span style={{
                      width:7, height:7, borderRadius:"50%", flexShrink:0,
                      background:s.layout.color,
                      boxShadow:`0 0 5px 1px rgba(${s.layout.glowC},.6)`,
                    }}/>
                    <span style={{ flex:1, minWidth:0, fontFamily:FONT_BODY, fontSize:12, color: isSel ? SPACE.accentTeal : SPACE.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {s.user.name}
                    </span>
                    {/* 소속 팀 색 표시(점선 조각) */}
                    {(teamsByUser.get(s.user.id) ?? []).map(k=>(
                      <span key={k} style={{ width:10, borderTop:`1px dashed ${teamLineColorFor(k).solid}`, opacity:.85, flexShrink:0 }}/>
                    ))}
                    <span style={{ fontFamily:FONT_HUD, fontSize:8.5, letterSpacing:"1px", color:SPACE.faint, flexShrink:0 }}>
                      MDM-{String(s.user.id).padStart(3,"0")}
                    </span>
                  </button>
                );
              })}
            </div>
          </HoloPanel>
        </div>
      )}

      {/* ── 관측 패널 ── */}
      {showPanel && panelUser && (
        <div
          onClick={e=>e.stopPropagation()}
          onTouchStart={e=>e.stopPropagation()}
          onTouchMove={e=>e.stopPropagation()}
          style={ isMobile
            // 모바일: 오른쪽 사이드 패널 대신 화면 하단에서 올라오는 시트 — 별은 위쪽 절반에 남는다.
            ? { position:"absolute", left:0, right:0, bottom:0, maxHeight:"64%", padding:12, zIndex:3, display:"flex", boxSizing:"border-box", touchAction:"pan-y" }
            : { position:"absolute", top:0, right:0, bottom:0, width:340, padding:20, zIndex:3, display:"flex", alignItems:"center" } }
        >
          {/* 패널 자체가 아니라 내부 래퍼가 스크롤한다 — 모서리 브래킷(HoloPanel의 absolute
              자식)이 스크롤을 따라 밀려 올라가지 않고 항상 패널 프레임 네 귀퉁이에 붙어 있게. */}
          <HoloPanel style={ isMobile
            ? { width:"100%", padding:0, display:"flex", animation:"slideInPanelUp .6s cubic-bezier(.25,.9,.25,1) .35s both" }
            : { width:"100%", maxHeight:"calc(100% - 40px)", padding:0, display:"flex", animation:"slideInPanel .85s cubic-bezier(.25,.9,.25,1) .7s both" } }>
            <div style={{ flex:1, minWidth:0, overflowY:"auto", padding:"22px 24px" }}>
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
                  {/* 밝기(Magnitude) — 능력치 총합 × 2.5. 등급 색은 별 코어 색과 동일.
                      아래 스펙트럼 바로 이 별이 적→황→백→청 어디쯤인지 한눈에 보여준다. */}
                  {panelGrade && (()=>{
                    const b = brightnessOf(panelUser.stats);
                    return (
                      <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:9 }}>
                        <div style={{ display:"flex", alignItems:"baseline", gap:9, justifyContent:"center" }}>
                          <span style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"2px", color:SPACE.label }}>MAGNITUDE</span>
                          <span style={{ fontFamily:FONT_DISPLAY, fontSize:19, fontWeight:500, color:panelGrade.color, textShadow:`0 0 12px rgba(${panelGrade.glowC},.55)` }}>
                            {b}
                          </span>
                          <span style={{ fontFamily:FONT_BODY, fontSize:11, color:panelGrade.color }}>
                            {panelGrade.label}
                            <span style={{ fontFamily:FONT_HUD, fontSize:8.5, letterSpacing:"1.5px", color:SPACE.faint, marginLeft:6 }}>{panelGrade.en} CLASS</span>
                          </span>
                        </div>
                        {/* 색 스펙트럼 바 — 눈금은 등급 경계(40/65/85), 마커는 이 별의 밝기 위치 */}
                        <div>
                          <div style={{ position:"relative", height:5, borderRadius:2, opacity:.9,
                            background:"linear-gradient(90deg,#ff8f80 0%,#ff8f80 9%,#ffd97a 28%,#f2f6ff 44%,#7cb8ff 62%,#7cb8ff 100%)" }}>
                            {[40,65,85].map(t=>(
                              <span key={t} style={{ position:"absolute", left:`${spectrumPct(t)}%`, top:-2, bottom:-2, width:1, background:"rgba(2,6,23,.75)" }}/>
                            ))}
                            <span style={{ position:"absolute", left:`${spectrumPct(b)}%`, top:"50%", transform:"translate(-50%,-50%)",
                              width:9, height:9, borderRadius:"50%", background:panelGrade.color,
                              border:"2px solid #020617", boxShadow:`0 0 8px rgba(${panelGrade.glowC},.9)` }}/>
                          </div>
                          <div style={{ position:"relative", height:12, marginTop:4 }}>
                            {[27.5, 52.5, 75, 117.5].map(v=>{
                              const g = gradeForBrightness(v);
                              return (
                                <span key={g.key} style={{ position:"absolute", left:`${spectrumPct(v)}%`, transform:"translateX(-50%)",
                                  fontFamily:FONT_BODY, fontSize:8.5, color:g.color, opacity: g.key===panelGrade.key ? 1 : .45 }}>
                                  {g.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                          <span style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"2px", color:SPACE.label }}>SURFACE TEMP <span style={{ color:SPACE.faint, letterSpacing:"0.5px" }}>· 표면온도</span></span>
                          <span style={{ fontFamily:FONT_HUD, fontSize:12, color:panelGrade.color }}>{surfaceTempOf(b).toLocaleString()} K</span>
                        </div>
                      </div>
                    );
                  })()}
                  {panelUser.bio && <p style={{ fontSize:12, color:SPACE.textDim, fontFamily:FONT_BODY, fontStyle:"italic", textAlign:"center", margin:0 }}>"{panelUser.bio}"</p>}
                  <div style={{ width:"100%" }}>
                    <HudLabel en="SPECTRAL ANALYSIS" kr="능력치 분석" stacked/>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      <ConstellationChart stats={panelUser.stats} size={230}/>
                    </div>
                  </div>
                  <div style={{ width:"100%" }}>
                    <HudLabel en="CONSTELLATION FRAGMENTS" kr="획득 칭호" stacked/>
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
            </div>
          </HoloPanel>
        </div>
      )}
    </div>
  );
}
