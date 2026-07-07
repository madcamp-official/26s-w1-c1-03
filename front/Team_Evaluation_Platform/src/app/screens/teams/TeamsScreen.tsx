import { useState, useEffect } from "react";
import { Users, Plus, UserPlus, Hash, Check, Copy, RefreshCw } from "lucide-react";
import {
  listMyTeams, createTeam, joinTeam, getTeam, listCards, listEvaluationTargets, ApiError,
  type TeamDetailDto, type TeamSummaryDto, type EvaluationTargetDto,
} from "../../api";
import type { Rarity } from "../../types";
import { RARITY } from "../../constants/rarity";
import { rarityFromCardStats } from "../../lib/cardMapping";
import { FALLBACK_AVATAR, handleImgError } from "../../lib/avatar";
import { copyToClipboard } from "../../lib/clipboard";
import { DS } from "../../design-system/tokens";
import { Btn, Field, Pill } from "../../design-system/primitives";
import { formatDeadline, DeadlineField } from "./DeadlineField";

// ─── Teams Screen ─────────────────────────────────────────────────────────────
export function TeamsScreen() {
  const [tab, setTab] = useState<"list"|"create"|"join">("list");
  const [myTeams, setMyTeams] = useState<TeamDetailDto[]|null>(null);
  const [rarityMap, setRarityMap] = useState<Record<number, Rarity|null>>({});
  const [evalTargets, setEvalTargets] = useState<EvaluationTargetDto[]>([]);
  const [tname, setTname] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const [deadlineFieldKey, setDeadlineFieldKey] = useState(0);
  const [code, setCode] = useState("");
  const [created, setCreated] = useState<string|null>(null);
  const [copiedKey, setCopiedKey] = useState<string|null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadTeams() {
    try {
      const [summaries, cards, targets] = await Promise.all([
        listMyTeams(), listCards(), listEvaluationTargets().catch(()=>[] as EvaluationTargetDto[]),
      ]);
      const details = await Promise.all(summaries.map(t=>getTeam(t.id)));
      setMyTeams(details);
      setRarityMap(Object.fromEntries(cards.map(c=>[c.userId, rarityFromCardStats(c.stats)])));
      setEvalTargets(targets);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "팀 목록을 불러오지 못했습니다.");
    }
  }
  useEffect(()=>{ loadTeams(); },[]);

  function teamStatus(team: TeamSummaryDto): "done"|"pending" {
    if (new Date(team.projectDeadline).getTime() > Date.now()) return "pending";
    const mine = evalTargets.filter(t=>t.teamId===team.id);
    return (mine.length===0 || mine.every(t=>t.alreadyEvaluated)) ? "done" : "pending";
  }

  async function create() {
    if (!tname) return;
    const deadlineMs = new Date(deadline).getTime();
    if (!deadline || isNaN(deadlineMs) || deadlineMs <= Date.now()) {
      setDeadlineError("유효한 기한을 입력해주세요.");
      return;
    }
    setDeadlineError(""); setError(""); setBusy(true);
    try {
      const team = await createTeam(tname, new Date(deadline).toISOString());
      setCreated(team.inviteCode);
      setTname(""); setDeadline(""); setDeadlineFieldKey(k=>k+1);
      loadTeams();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "팀 생성 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function join() {
    setError(""); setBusy(true);
    try {
      await joinTeam(code);
      setCode(""); setTab("list");
      loadTeams();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "팀 참여 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function copy(key:string, text:string) {
    const ok = await copyToClipboard(text);
    if (!ok) { setError("클립보드 복사에 실패했습니다."); return; }
    setCopiedKey(key);
    setTimeout(()=>setCopiedKey(k=>k===key?null:k), 2000);
  }

  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:20 }}>팀 관리</h1>
      {error && <p style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'", marginBottom:14 }}>{error}</p>}
      <div style={{ display:"flex", gap:6, marginBottom:24 }}>
        {[{k:"list",l:"내 팀",Icon:Users},{k:"create",l:"팀 만들기",Icon:Plus},{k:"join",l:"팀 참여",Icon:UserPlus}].map(({k,l,Icon})=>(
          <Btn key={k} variant={tab===k?"secondary":"ghost"} onClick={()=>{setTab(k as typeof tab);setCreated(null);}} icon={<Icon size={13}/>}>{l}</Btn>
        ))}
      </div>
      {tab==="list" && (
        myTeams===null ? (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}><RefreshCw size={16} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:13 }}>팀 목록을 불러오는 중...</span></div>
        ) : myTeams.length===0 ? (
          <p style={{ fontSize:13, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>아직 소속된 팀이 없습니다. 팀을 만들거나 초대 코드로 참여해보세요.</p>
        ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {myTeams.map(({team, members})=>{
            const status = teamStatus(team);
            const teamKey = String(team.id);
            return (
            <div key={team.id} style={{ ...DS.card, padding:"18px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0" }}>{team.name}</div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                  <Pill label={status==="done"?"완료됨":"진행 중"} color={status==="done"?"#34d399":"#00c8ff"} small/>
                  <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#8899bb", fontFamily:"'Orbitron',monospace" }}>
                    <Hash size={9}/>{team.inviteCode}
                    <button onClick={()=>copy(teamKey,team.inviteCode)} title="초대 코드 복사" style={{ background:"none", border:"none", color:copiedKey===teamKey?"#34d399":"#8899bb", cursor:"pointer", padding:2, display:"flex", alignItems:"center" }}>
                      {copiedKey===teamKey ? <Check size={11}/> : <Copy size={11}/>}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:2 }}>멤버 {team.memberCount}명</div>
              <div style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:14 }}>마감 {formatDeadline(team.projectDeadline)}</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {members.map(m=>{
                  const rarity = rarityMap[m.userId];
                  const borderColor = rarity ? RARITY[rarity].color : "#4a5a7a";
                  return (
                    <div key={m.userId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{ width:38, height:38, borderRadius:999, overflow:"hidden", border:`2px solid ${borderColor}` }}>
                        <img src={m.profileImageUrl || FALLBACK_AVATAR} alt={m.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      </div>
                      <span style={{ fontSize:10, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{m.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
        )
      )}
      {tab==="create" && (
        <div style={{ ...DS.card, padding:"24px", maxWidth:420 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="팀 이름" value={tname} onChange={setTname} placeholder="예) 감마팀"/>
            <DeadlineField key={deadlineFieldKey} value={deadline} onChange={v=>{setDeadline(v);setDeadlineError("");}} error={deadlineError||undefined}/>
            <Btn icon={<Plus size={13}/>} onClick={create} disabled={busy}>{busy?"생성 중...":"팀 생성"}</Btn>
            {created && (
              <div style={{ padding:"16px", borderRadius:10, background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.25)" }}>
                <p style={{ fontSize:12, color:"#34d399", fontFamily:"'Noto Sans KR'", marginBottom:8 }}>✓ 팀이 생성되었습니다! 초대 코드를 공유하세요.</p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:24, fontFamily:"'Orbitron',monospace", color:"#34d399", fontWeight:700, letterSpacing:"0.15em" }}>{created}</span>
                  <button onClick={()=>copy("created",created)} style={{ padding:"6px 12px", borderRadius:8, background:"rgba(52,211,153,0.15)", color:"#34d399", border:"1px solid rgba(52,211,153,0.3)", cursor:"pointer", fontSize:12, fontFamily:"'Noto Sans KR'", display:"flex", alignItems:"center", gap:5 }}>
                    {copiedKey==="created"?<Check size={12}/>:<Copy size={12}/>}{copiedKey==="created"?"복사됨":"복사"}
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
              <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="######" style={{ background:"none", border:"none", outline:"none", padding:"11px 10px", color:"#00c8ff", fontSize:18, fontFamily:"'Orbitron',monospace", letterSpacing:"0.18em", flex:1 }}/>
            </div>
            <Btn full variant="purple" disabled={code.length<5||busy} onClick={join} icon={<UserPlus size={13}/>}>{busy?"참여 중...":"팀 참여하기"}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
