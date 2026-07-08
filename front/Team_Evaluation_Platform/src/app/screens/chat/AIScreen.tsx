import { useState, useEffect, useRef } from "react";
import { listStars, createChatSession, sendChatMessage, ApiError } from "../../api";
import type { User, ChatMessage } from "../../types";
import { starToUser, deriveEvaluationLocked } from "../../lib/starMapping";
import { gradeForStats } from "../../lib/brightness";
import { AVATAR_IMG, handleImgError } from "../../lib/avatar";
import { useIsMobile } from "../../lib/useIsMobile";
import { OBS, ObservatoryStyle, SpaceBackground, MonoLabel } from "../../design-system/observatory";

const AI_QUESTIONS = [
  "이 사람의 강점은?", "우리 팀 조합은 어때?", "누가 백엔드에 적합할까?",
  "팀의 시너지는?", "부족한 역할은?", "누굴 추가하면 좋을까?",
];

// 별 색 변주(design.md §3): 청백 / 순백 / 보라를 대상 목록에 순환 적용한다.
const STAR_COLORS = [
  { core: "#9ed2ff", glow: "125,190,255" },
  { core: "#f2f6ff", glow: "220,235,255" },
  { core: "#c4b0ff", glow: "167,139,250" },
];

// ─── AI Analysis Screen (MADNOVA CORE) ─────────────────────────────────────────
export function AIScreen() {
  const [stars, setStars] = useState<User[]|null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [sessionId, setSessionId] = useState<number|null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ role:"ai", text:"MADNOVA CORE 온라인. 선택된 별들의 관측 기록을 기반으로 분석을 시작합니다. 아래 예시 질문을 선택하거나 직접 입력하세요." }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [displayIdx, setDisplayIdx] = useState<number>(-1);
  const [displayText, setDisplayText] = useState("");
  const msgEnd = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(()=>{
    listStars().then(list=>{
      const mapped = list.map(starToUser);
      setStars(mapped);
      if (mapped[0]) setSelected([mapped[0].id]);
    }).catch(e=>setError(e instanceof ApiError ? e.message : "참가자 목록을 불러오지 못했습니다."));
  },[]);

  // 선택된 별 조합이 바뀌면 새 대화 세션에서 다시 시작한다.
  useEffect(()=>{ setSessionId(null); },[selected.join(",")]);

  const selUsers = (stars??[]).filter(u=>selected.includes(u.id));
  const locked = deriveEvaluationLocked(stars);

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
      setMsgs(m=>[...m,{role:"ai",text:"통신 링크가 불안정합니다. 안테나를 재정렬하는 동안 잠시 후 다시 질문해 주세요."}]);
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

  const canSend = !locked && input.trim() !== "" && !typing;

  return (
    <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", height:"100%", overflow:"hidden", position:"relative", background:OBS.bg }}>
      <ObservatoryStyle/>
      <SpaceBackground density={45} dimmed/>

      {/* 관측 대상 선택 — 데스크톱은 좌측 세로 패널, 모바일은 상단 가로 스크롤 스트립 */}
      <div style={ isMobile
        ? { position:"relative", zIndex:1, borderBottom:OBS.borderSoft, padding:"12px 14px 10px", display:"flex", flexDirection:"column", gap:8, flexShrink:0 }
        : { position:"relative", zIndex:1, width:236, borderRight:OBS.borderSoft, padding:"20px 16px", display:"flex", flexDirection:"column", gap:9, overflowY:"auto" } }>
        <div style={{ marginBottom: isMobile ? 0 : 8 }}>
          <MonoLabel size={9.5} spacing={3.5}>TARGET SELECTION <span style={{ color:OBS.faint }}>· 분석 대상</span></MonoLabel>
        </div>
        {stars===null ? (
          <div style={{ animation:"obsBlinkDim 1.1s ease-in-out infinite" }}>
            <MonoLabel size={9.5} spacing={2.5} color={OBS.teal}>⌁ SCANNING GALAXY…</MonoLabel>
          </div>
        ) : (
          <div style={ isMobile
            ? { display:"flex", gap:8, overflowX:"auto", paddingBottom:2 }
            : { display:"flex", flexDirection:"column", gap:9 } }>
            {stars.map((u,idx)=>{
              // 밝기 등급 색(청/백/황/적) — 잠긴 별은 능력치를 모르므로 기존 순환 색으로 둔다.
              const grade = u.isUnlocked ? gradeForStats(u.stats) : null;
              const star = grade ? { core:grade.color, glow:grade.glowC } : STAR_COLORS[idx%STAR_COLORS.length];
              const sel=selected.includes(u.id);
              return (
                <div key={u.id} onClick={()=>toggleSel(u.id)} className="obs-chip" style={{
                  display:"flex", alignItems:"center", gap:10, padding:"9px 11px", borderRadius:2, cursor:"pointer",
                  flex: isMobile ? "0 0 auto" : undefined,
                  background: sel ? "rgba(94,234,212,.06)" : "rgba(125,180,255,.03)",
                  border: sel ? "1px solid rgba(94,234,212,.45)" : "1px solid rgba(125,180,255,.14)",
                }}>
                  <div style={{
                    width:7, height:7, borderRadius:"50%", flexShrink:0, background:star.core,
                    boxShadow: sel
                      ? `0 0 7px 2px rgba(${star.glow},.9), 0 0 14px 4px rgba(${star.glow},.4)`
                      : `0 0 5px 1px rgba(${star.glow},.5)`,
                    transition:"box-shadow .3s",
                  }}/>
                  <div style={{ width:26, height:26, borderRadius:"50%", overflow:"hidden", flexShrink:0, border:"1px solid rgba(125,180,255,.25)", boxShadow: sel ? `0 0 10px rgba(${star.glow},.35)` : "none" }}>
                    <img src={u.photo} alt={u.name} onError={handleImgError} style={AVATAR_IMG}/>
                  </div>
                  <div style={{ flex:1, minWidth:0, fontSize:12.5, fontWeight:sel?500:300, fontFamily:OBS.kr, color:sel?"#BAE6FD":OBS.body, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {u.name}
                  </div>
                  {sel && <span style={{ color:OBS.teal, fontSize:9, flexShrink:0, fontFamily:OBS.mono }}>◉</span>}
                </div>
              );
            })}
          </div>
        )}
        {locked && (
          <div style={{ marginTop: isMobile ? 2 : 6, padding:"10px 11px", border:"1px dashed rgba(125,180,255,.25)", borderRadius:2 }}>
            <div style={{ marginBottom:4 }}><MonoLabel size={8.5} spacing={2} color={OBS.violet}>SPECTRAL DATA LOCKED</MonoLabel></div>
            <div style={{ fontSize:11, fontWeight:300, lineHeight:1.6, color:OBS.dim, fontFamily:OBS.kr }}>동료 관측(평가)을 완료하면 분석이 열립니다.</div>
          </div>
        )}
      </div>

      {/* 우측: MADNOVA CORE 콘솔 */}
      <div style={{ position:"relative", zIndex:1, flex:1, minHeight:0, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* 헤더 */}
        <div style={{ padding: isMobile ? "12px 14px" : "17px 24px", borderBottom:OBS.borderSoft, display:"flex", alignItems:"center", gap:11 }}>
          <span style={{ color:OBS.teal, fontSize:13 }}>◈</span>
          <div style={{ flex:1 }}>
            <MonoLabel size={10.5} spacing={3} color={OBS.starWhite}>MADNOVA CORE</MonoLabel>
            <div className="hide-mobile" style={{ marginTop:3 }}>
              <MonoLabel size={8.5} spacing={2}>OBSERVATORY AI · <span style={{ color:OBS.teal }}>ONLINE</span></MonoLabel>
            </div>
          </div>
          <MonoLabel size={9} spacing={2}>{selUsers.length} TARGET{selUsers.length===1?"":"S"} LOCKED <span className="hide-mobile" style={{ color:OBS.faint }}>· {selUsers.length}명 선택됨</span></MonoLabel>
        </div>

        {/* 로그 */}
        <div style={{ flex:1, overflowY:"auto", padding: isMobile ? "14px 14px" : "20px 24px" }}>
          {msgs.map((m,i)=>{
            const isLast=i===msgs.length-1; const isUser=m.role==="user";
            const text=(isLast&&i===displayIdx)?displayText:m.text;
            return (
              <div key={i} style={{ marginBottom:16, animation:"obsFadeIn .5s both" }}>
                <div style={{ marginBottom:4 }}>
                  <MonoLabel size={8.5} spacing={2.5} color={isUser?OBS.sky:OBS.teal}>{isUser?"YOU ▸":"CORE ⌁"}</MonoLabel>
                </div>
                <div style={{ fontSize:13, fontWeight:300, lineHeight:1.75, whiteSpace:"pre-wrap", fontFamily:OBS.kr, color:isUser?"#8fa8cf":OBS.body }}>
                  {text}
                </div>
              </div>
            );
          })}
          {typing && (
            <div style={{ animation:"obsBlinkDim 1s ease-in-out infinite" }}>
              <MonoLabel size={9} spacing={3} color={OBS.teal}>⌁ TRANSMITTING…</MonoLabel>
            </div>
          )}
          <div ref={msgEnd}/>
        </div>

        {error && (
          <div style={{ padding: isMobile ? "0 14px 6px" : "0 24px 6px" }}>
            <MonoLabel size={8.5} spacing={2} color="#f87171">⚠ LINK ERROR</MonoLabel>
            <span style={{ fontSize:11.5, fontWeight:300, color:"#fca5a5", fontFamily:OBS.kr, marginLeft:8 }}>{error}</span>
          </div>
        )}

        {/* 예시 질문 — 모바일은 화면을 덜 차지하게 한 줄 가로 스크롤로.
            모바일에선 pointerEvents:none을 걸면 잠금 상태에서 스크롤까지 막히므로,
            클릭 차단은 버튼 disabled에 맡기고 컨테이너는 항상 스크롤 가능하게 둔다.
            휠은 기본적으로 가로 스크롤 컨테이너를 움직이지 못하므로 세로 휠도 가로로 흘려준다. */}
        <div
          ref={chipsRef}
          onWheel={e=>{
            const el = chipsRef.current;
            if (el && el.scrollWidth > el.clientWidth) el.scrollLeft += e.deltaY + e.deltaX;
          }}
          style={ isMobile
            ? { padding:"6px 14px 0", display:"flex", flexWrap:"nowrap", overflowX:"auto", gap:7, opacity:locked?0.4:1, flexShrink:0, minWidth:0, touchAction:"pan-x", WebkitOverflowScrolling:"touch", overscrollBehaviorX:"contain" }
            : { padding:"6px 24px 0", display:"flex", flexWrap:"wrap", gap:7, opacity:locked?0.4:1, pointerEvents:locked?"none":"auto" } }>
          {AI_QUESTIONS.map(q=>(
            <button key={q} disabled={locked} onClick={()=>send(q)} className="obs-chip" style={{
              padding:"5px 11px", borderRadius:2, fontSize:11.5, fontWeight:300, fontFamily:OBS.kr, cursor:"pointer",
              background:"rgba(125,180,255,.05)", color:OBS.body, border:"1px solid rgba(125,180,255,.22)",
              flexShrink: isMobile ? 0 : undefined, whiteSpace:"nowrap",
            }}>
              <span style={{ color:OBS.violet, fontSize:8, marginRight:6, fontFamily:OBS.mono }}>✦</span>{q}
            </button>
          ))}
          {/* 가로 스크롤 끝에서 마지막 칩이 오른쪽 패딩 없이 잘려 보이지 않게 하는 여백 */}
          {isMobile && <span style={{ flex:"0 0 8px" }}/>}
        </div>

        {/* 입력 콘솔 */}
        <div style={{ margin: isMobile ? "10px 14px 14px" : "12px 24px 20px", display:"flex", alignItems:"center", gap:11, padding:"12px 16px", border:OBS.border, borderRadius:2, background:"rgba(8,17,38,.72)", backdropFilter:"blur(6px)" }}>
          <span style={{ fontFamily:OBS.mono, fontSize:11, color:locked?OBS.faint:OBS.teal }}>▸</span>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            disabled={locked}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}}
            placeholder={locked?"평가를 완료하세요":"별에 대해 질문하세요…"}
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:OBS.starWhite, fontFamily:OBS.kr, fontSize:13, fontWeight:300, opacity:locked?0.6:1, cursor:locked?"not-allowed":"text" }}
          />
          <button onClick={()=>send(input)} disabled={!canSend} className={canSend?"obs-hover-bright":undefined} style={{
            background:"none", border:"none", padding:"4px 2px",
            cursor:canSend?"pointer":"not-allowed",
            fontFamily:OBS.mono, fontSize:10, letterSpacing:2,
            color:canSend?OBS.sky:OBS.faint,
          }}>SEND</button>
        </div>
      </div>
    </div>
  );
}
