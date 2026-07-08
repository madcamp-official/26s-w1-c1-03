import { useState, useEffect } from "react";
import { Check, Copy, RefreshCw, LogOut } from "lucide-react";
import {
  listMyTeams, createTeam, joinTeam, getTeam, leaveTeam, listEvaluationTargets, ApiError,
  type TeamDetailDto, type TeamSummaryDto, type EvaluationTargetDto,
} from "../../api";
import { AVATAR_IMG, FALLBACK_AVATAR, handleImgError } from "../../lib/avatar";
import { copyToClipboard } from "../../lib/clipboard";
import { useIsMobile } from "../../lib/useIsMobile";
import { SPACE, FONT } from "../../design-system/space";
import { SpaceBackground } from "../../design-system/SpaceBackground";
import { HoloPanel } from "../../design-system/HoloPanel";
import { HudLabel } from "../../design-system/HudLabel";
import { formatDeadline, DeadlineField } from "./DeadlineField";

// 관측소 계기판 공통 입력 스타일 — ProfileScreen의 TRANSMISSION LOG 입력과 동일한 문법.
const INPUT_STYLE: React.CSSProperties = {
  width:"100%", boxSizing:"border-box", padding:"11px 13px",
  background:"rgba(125,180,255,0.05)", border:`1px solid ${SPACE.border}`, borderRadius:3,
  color:SPACE.starWhite, fontFamily:FONT.body, fontSize:13, outline:"none",
};

// 팀 나가기 등 파괴적 동작에만 쓰는 경고색 — CompareScreen 에러 텍스트와 동일한 톤으로 통일.
const DANGER = "#f87171";

// design.md §84 언어 규칙: 시스템 라벨은 영어 mono, 본문은 한국어 — 탭도 같은 문법을 쓴다.
const TABS = [
  { k:"list"   as const, en:"MY GALAXIES", kr:"내 팀" },
  { k:"create" as const, en:"FORM GALAXY", kr:"팀 만들기" },
  { k:"join"   as const, en:"DOCKING",     kr:"팀 참여" },
];

// design.md §43: 주 버튼은 하늘색→청록 그라데이션 + 어두운 글자. EvaluateScreen의
// TRANSMIT 버튼과 동일한 활성/비활성 문법을 쓴다.
function transmitButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    width:"100%", padding:"12px 0", borderRadius:2, textAlign:"center",
    fontFamily:FONT.hud, fontSize:10.5, letterSpacing:"2.5px",
    cursor: enabled ? "pointer" : "not-allowed", transition:"all .4s",
    background: enabled ? SPACE.buttonGradient : "rgba(125,180,255,.06)",
    color: enabled ? SPACE.bgDeep : SPACE.label,
    border: enabled ? "none" : `1px solid ${SPACE.border}`,
    boxShadow: enabled ? "0 0 22px rgba(94,234,212,.3)" : "none",
  };
}

// ─── Teams Screen (design.md: 팀 = 은하) ─────────────────────────────────────
export function TeamsScreen() {
  const [tab, setTab] = useState<"list"|"create"|"join">("list");
  const [myTeams, setMyTeams] = useState<TeamDetailDto[]|null>(null);
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
  // 팀 나가기 확인 2단계 상태: 먼저 armedLeaveId로 "정말요?" 상태를 켜고, 확정되면
  // leavingId로 요청 진행 중임을 표시한다. 실수로 즉시 팀을 나가버리는 걸 막기 위함.
  const [armedLeaveId, setArmedLeaveId] = useState<number|null>(null);
  const [leavingId, setLeavingId] = useState<number|null>(null);
  const isMobile = useIsMobile();

  async function loadTeams() {
    try {
      const [summaries, targets] = await Promise.all([
        listMyTeams(), listEvaluationTargets().catch(()=>[] as EvaluationTargetDto[]),
      ]);
      const details = await Promise.all(summaries.map(t=>getTeam(t.id)));
      // API가 주는 순서(생성/기한 순)를 그대로 뒤집어 최근 팀이 위로 오게 한다.
      setMyTeams([...details].reverse());
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
  async function leave(teamId: number) {
    setError(""); setLeavingId(teamId);
    try {
      await leaveTeam(teamId);
      setArmedLeaveId(null);
      await loadTeams();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "팀 나가기 중 오류가 발생했습니다.");
    } finally {
      setLeavingId(null);
    }
  }
  async function copy(key:string, text:string) {
    const ok = await copyToClipboard(text);
    if (!ok) { setError("클립보드 복사에 실패했습니다."); return; }
    setCopiedKey(key);
    setTimeout(()=>setCopiedKey(k=>k===key?null:k), 2000);
  }

  return (
    <div style={{ position:"relative", height:"100%", overflow:"hidden" }}>
      <SpaceBackground/>
      <div style={{ position:"absolute", inset:0, zIndex:1, overflowY:"auto", padding: isMobile ? "22px 16px 34px" : "36px 40px 48px", boxSizing:"border-box" }}>
        {/* 헤더 */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:FONT.hud, fontSize:10, letterSpacing:"3px", color:SPACE.label, textTransform:"uppercase", marginBottom:6 }}>OBSERVATORY · GALAXY REGISTRY</div>
          <h1 style={{ fontFamily:"'Space Grotesk', 'Noto Sans KR', sans-serif", fontSize:26, fontWeight:500, color:SPACE.starWhite2, letterSpacing:"0.5px", margin:0 }}>팀 관리</h1>
          <p style={{ margin:"6px 0 0", fontSize:12.5, fontWeight:300, lineHeight:1.7, color:SPACE.textDim, fontFamily:FONT.body }}>
            팀은 하나의 은하입니다. 새 은하를 형성하거나, 접근 코드로 다른 은하에 도킹하세요.
          </p>
        </div>

        {error && <p style={{ fontSize:12, color:"#f87171", fontFamily:FONT.body, marginBottom:14 }}>{error}</p>}

        {/* 탭 */}
        <div style={{ display:"flex", gap:8, marginBottom:26, flexWrap:"wrap" }}>
          {TABS.map(({k,en,kr})=>{
            const active = tab===k;
            return (
              <button key={k} onClick={()=>{setTab(k);setCreated(null);}} style={{
                display:"inline-flex", alignItems:"baseline", gap:8, cursor:"pointer",
                padding:"9px 16px", borderRadius:2, transition:"all .2s",
                background: active ? "rgba(94,234,212,.08)" : "rgba(125,180,255,.03)",
                border: `1px solid ${active ? "rgba(94,234,212,.5)" : SPACE.border}`,
                boxShadow: active ? "0 0 14px rgba(94,234,212,.18)" : "none",
              }}>
                <span style={{ fontFamily:FONT.hud, fontSize:10, letterSpacing:"2px", color: active ? SPACE.accentTeal : SPACE.label }}>{en}</span>
                <span style={{ fontFamily:FONT.body, fontSize:11, color: active ? SPACE.text : SPACE.faint }}>{kr}</span>
              </button>
            );
          })}
        </div>

        {tab==="list" && (
          myTeams===null ? (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <RefreshCw size={16} style={{ color:SPACE.accentSky, animation:"spin 1s linear infinite" }}/>
              <span style={{ color:SPACE.textDim, fontFamily:FONT.body, fontSize:13 }}>은하 목록을 탐색하는 중...</span>
            </div>
          ) : myTeams.length===0 ? (
            <p style={{ fontSize:13, fontWeight:300, color:SPACE.label, fontFamily:FONT.body }}>아직 소속된 은하가 없습니다. 새 은하를 형성하거나 접근 코드로 도킹해보세요.</p>
          ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:760 }}>
            {myTeams.map(({team, members}, idx)=>{
              const status = teamStatus(team);
              const teamKey = String(team.id);
              const done = status==="done";
              return (
              <HoloPanel key={team.id} style={{ padding: isMobile ? "18px 16px" : "20px 24px", animation:`fadeUp .6s ${idx*0.08}s both` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:10 }}>
                  <div>
                    <div style={{ fontFamily:FONT.hud, fontSize:9, letterSpacing:"2px", color:SPACE.label, marginBottom:4 }}>GALAXY</div>
                    <div style={{ fontFamily:"'Space Grotesk', 'Noto Sans KR', sans-serif", fontSize:18, fontWeight:500, color:SPACE.starWhite }}>{team.name}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:7 }}>
                    <span style={{ fontFamily:FONT.hud, fontSize:9.5, letterSpacing:"2.5px", color: done ? SPACE.accentTeal : SPACE.accentSky }}>
                      {done ? "✦ COMPLETE" : "◉ IN PROGRESS"}
                      <span style={{ fontFamily:FONT.body, fontSize:10, letterSpacing:0, color:SPACE.faint, marginLeft:6 }}>{done?"완료됨":"진행 중"}</span>
                    </span>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:FONT.hud, fontSize:10, letterSpacing:"1.5px", color:SPACE.textDim }}>
                      <span style={{ color:SPACE.faint }}>CODE</span> {team.inviteCode}
                      <button onClick={()=>copy(teamKey,team.inviteCode)} title="초대 코드 복사" style={{ background:"none", border:"none", color:copiedKey===teamKey?SPACE.accentTeal:SPACE.label, cursor:"pointer", padding:2, display:"flex", alignItems:"center" }}>
                        {copiedKey===teamKey ? <Check size={11}/> : <Copy size={11}/>}
                      </button>
                    </span>

                    {armedLeaveId===team.id ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8, animation:"fadeUp .2s both" }}>
                        <span style={{ fontFamily:FONT.body, fontSize:10.5, color:DANGER }}>
                          {done ? "정말 나가시겠어요?" : "탈퇴하면 재평가 기회를 잃어요."}
                        </span>
                        <button onClick={()=>leave(team.id)} disabled={leavingId===team.id} style={{
                          background:"rgba(248,113,113,.12)", border:`1px solid ${DANGER}`, borderRadius:2,
                          color:DANGER, fontFamily:FONT.hud, fontSize:9.5, letterSpacing:"1.5px",
                          padding:"4px 9px", cursor:leavingId===team.id?"not-allowed":"pointer",
                        }}>
                          {leavingId===team.id ? "···" : "확인"}
                        </button>
                        <button onClick={()=>setArmedLeaveId(null)} style={{
                          background:"none", border:"none", color:SPACE.label, fontFamily:FONT.hud,
                          fontSize:9.5, letterSpacing:"1.5px", cursor:"pointer", padding:"4px 2px",
                        }}>
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={()=>setArmedLeaveId(team.id)}
                        onMouseEnter={e=>{ e.currentTarget.style.color = DANGER; e.currentTarget.style.borderColor = "rgba(248,113,113,.4)"; }}
                        onMouseLeave={e=>{ e.currentTarget.style.color = SPACE.label; e.currentTarget.style.borderColor = "transparent"; }}
                        style={{
                          display:"inline-flex", alignItems:"center", gap:5,
                          background:"none", border:"1px solid transparent", borderRadius:2,
                          padding:"3px 6px", margin:"-3px -6px 0 0", cursor:"pointer", transition:"all .2s",
                          color:SPACE.label, fontFamily:FONT.hud, fontSize:9.5, letterSpacing:"1.8px",
                        }}
                      >
                        <LogOut size={10.5}/> EXIT <span style={{ fontFamily:FONT.body, fontSize:10, letterSpacing:0, color:"inherit" }}>· 나가기</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display:"flex", gap:22, rowGap:8, marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${SPACE.border}`, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:FONT.hud, fontSize:9.5, letterSpacing:"2px", color:SPACE.label }}>
                    STARS <span style={{ color:SPACE.accentSky }}>{team.memberCount}</span>
                  </span>
                  <span style={{ fontFamily:FONT.hud, fontSize:9.5, letterSpacing:"2px", color:SPACE.label }}>
                    DEADLINE <span style={{ color:SPACE.text }}>{formatDeadline(team.projectDeadline)}</span>
                  </span>
                </div>

                <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                  {members.map(m=>{
                    // 프로필 테두리는 팀원 평가 화면(StarPortrait 기본값)과 동일한 하늘색으로 통일.
                    return (
                      <div key={m.userId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                        <div style={{
                          width:40, height:40, borderRadius:"50%", overflow:"hidden",
                          border:"1px solid rgba(125,211,252,.5)",
                          boxShadow:"0 0 9px rgba(125,211,252,.45)",
                        }}>
                          <img src={m.profileImageUrl || FALLBACK_AVATAR} alt={m.name} onError={handleImgError} style={AVATAR_IMG}/>
                        </div>
                        <span style={{ fontSize:10.5, fontWeight:300, color:SPACE.textDim, fontFamily:FONT.body }}>{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              </HoloPanel>
              );
            })}
          </div>
          )
        )}

        {tab==="create" && (
          <HoloPanel style={{ maxWidth:440, animation:"fadeUp .6s both" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <HudLabel en="GALAXY NAME" kr="팀 이름"/>
                <input value={tname} onChange={e=>setTname(e.target.value)} placeholder="예) 감마팀" style={INPUT_STYLE}/>
              </div>
              <DeadlineField key={deadlineFieldKey} value={deadline} onChange={v=>{setDeadline(v);setDeadlineError("");}} error={deadlineError||undefined}/>
              <button onClick={create} disabled={busy||!tname} style={transmitButtonStyle(!busy&&!!tname)}>
                {busy ? "⌁ FORMING…" : "⌁ FORM GALAXY · 팀 생성"}
              </button>
              {created && (
                <div style={{ padding:"16px 18px", borderRadius:3, background:"rgba(94,234,212,.06)", border:"1px solid rgba(94,234,212,.35)", animation:"fadeUp .5s both" }}>
                  <div style={{ fontFamily:FONT.hud, fontSize:10, letterSpacing:"2.5px", color:SPACE.accentTeal, marginBottom:4 }}>
                    <span style={{ textShadow:"0 0 12px rgba(94,234,212,.8)" }}>✦</span> GALAXY FORMED
                  </div>
                  <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:300, color:SPACE.textDim, fontFamily:FONT.body }}>새 은하가 형성되었습니다. 접근 코드를 팀원에게 공유하세요.</p>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:22, fontFamily:FONT.hud, color:SPACE.accentTeal, letterSpacing:"0.18em", textShadow:"0 0 14px rgba(94,234,212,.45)" }}>{created}</span>
                    <button onClick={()=>copy("created",created)} style={{
                      display:"flex", alignItems:"center", gap:5, cursor:"pointer",
                      padding:"7px 13px", borderRadius:2,
                      background:"rgba(94,234,212,.1)", color:SPACE.accentTeal, border:"1px solid rgba(94,234,212,.4)",
                      fontFamily:FONT.hud, fontSize:9.5, letterSpacing:"2px",
                    }}>
                      {copiedKey==="created"?<Check size={11}/>:<Copy size={11}/>}{copiedKey==="created"?"COPIED":"COPY"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </HoloPanel>
        )}

        {tab==="join" && (
          <HoloPanel style={{ maxWidth:440, animation:"fadeUp .6s both" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <HudLabel en="ACCESS CODE" kr="초대 코드"/>
                <p style={{ margin:"0 0 10px", fontSize:12.5, fontWeight:300, lineHeight:1.7, color:SPACE.textDim, fontFamily:FONT.body }}>팀장에게 받은 접근 코드를 입력해 은하에 도킹하세요.</p>
                <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="######" style={{
                  ...INPUT_STYLE, textAlign:"center",
                  color:SPACE.accentSky, fontSize:18, fontFamily:FONT.hud, letterSpacing:"0.22em",
                }}/>
              </div>
              <button onClick={join} disabled={code.length<5||busy} style={transmitButtonStyle(code.length>=5&&!busy)}>
                {busy ? "⌁ DOCKING…" : "⌁ DOCK TO GALAXY · 팀 참여"}
              </button>
            </div>
          </HoloPanel>
        )}
      </div>
    </div>
  );
}
