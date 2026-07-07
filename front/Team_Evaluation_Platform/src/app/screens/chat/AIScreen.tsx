import { useState, useEffect, useRef } from "react";
import { Check, Bot, Send, RefreshCw } from "lucide-react";
import { listCards, createChatSession, sendChatMessage, ApiError } from "../../api";
import type { User, ChatMessage } from "../../types";
import { RARITY } from "../../constants/rarity";
import { cardToUser, deriveEvaluationLocked } from "../../lib/cardMapping";
import { handleImgError } from "../../lib/avatar";
import { DS } from "../../design-system/tokens";

const AI_QUESTIONS = [
  "이 사람의 강점은?", "우리 팀 조합은 어때?", "누가 백엔드에 적합할까?",
  "팀의 시너지는?", "부족한 역할은?", "누굴 추가하면 좋을까?",
];

// (기존에는 여기서 로컬 목업 AI 응답을 만들었지만, 이제 AIScreen이 실제 /api/chat 세션을 호출한다.)

// ─── AI Analysis Screen ───────────────────────────────────────────────────────
export function AIScreen() {
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
