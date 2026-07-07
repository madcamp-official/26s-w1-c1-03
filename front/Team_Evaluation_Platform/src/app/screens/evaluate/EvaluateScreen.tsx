import { useState, useEffect } from "react";
import { Check, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  listEvaluationTargets, listTitles, submitEvaluation, ApiError,
  type EvaluationTargetDto, type TitleDto,
} from "../../api";
import type { Stats } from "../../types";
import { STATS } from "../../constants/stats";
import { FALLBACK_AVATAR, handleImgError } from "../../lib/avatar";
import { DS } from "../../design-system/tokens";
import { Btn, Pill, Progress, StatSlider } from "../../design-system/primitives";
import { MiniHex } from "../../design-system/HexChart";

// ─── Evaluate Screen ──────────────────────────────────────────────────────────
export function EvaluateScreen({ onDone }: { onDone:()=>void }) {
  const [teammates, setTeammates] = useState<EvaluationTargetDto[]|null>(null);
  const [titleOptions, setTitleOptions] = useState<TitleDto[]|null>(null);
  const [error, setError] = useState("");
  const [ratings, setRatings] = useState<Record<number,Partial<Stats>>>({});
  const [titles, setTitles] = useState<Record<number,number>>({});
  const [done, setDone] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState<number|null>(null);

  useEffect(()=>{
    (async () => {
      try {
        const [targets, titleList] = await Promise.all([listEvaluationTargets(), listTitles()]);
        setTeammates(targets);
        setTitleOptions(titleList);
        setRatings(Object.fromEntries(targets.map(t=>[t.userId,{attack:5,defense:5,agility:5,teamwork:5,health:5,mana:5}])));
        setDone(targets.filter(t=>t.alreadyEvaluated).map(t=>t.userId));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "평가 대상자를 불러오지 못했습니다.");
      }
    })();
  },[]);

  const teamName = teammates && teammates.length>0
    ? Array.from(new Set(teammates.map(t=>t.teamName))).join(", ")
    : "";

  function setR(uid:number,key:string,v:number){setRatings(p=>({...p,[uid]:{...p[uid],[key]:v}}))}
  // 초기 능력치 설정과 동일한 규칙(백엔드 SubmitEvaluationRequest.isTotalWithinRange()): 총합 6~40.
  function statsSum(r: Partial<Stats>|undefined): number {
    return STATS.reduce((sum,s)=>sum+((r?.[s.key as keyof Stats])??5),0);
  }

  async function submit(uid:number) {
    const titleId = titles[uid];
    const target = teammates?.find(t=>t.userId===uid);
    if (!titleId || !target) return;
    const r = ratings[uid] ?? {};
    const sum = statsSum(r);
    if (sum<6 || sum>40) { setError("능력치 총합을 6-40 사이로 설정해주세요."); return; }
    setSubmitting(uid); setError("");
    try {
      await submitEvaluation({
        teamId: target.teamId,
        targetUserId: uid,
        attack: r.attack??5, defense: r.defense??5, agility: r.agility??5,
        teamwork: r.teamwork??5, mana: r.mana??5, health: r.health??5,
        titleIds: [titleId],
      });
      const nextDone = [...done, uid];
      setDone(nextDone);
      if (teammates && nextDone.length===teammates.length) setTimeout(onDone,600);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "평가 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(null);
    }
  }

  if (teammates===null) {
    return (
      <div style={{ padding:"28px 32px" }}>
        {error
          ? <p style={{ fontSize:13, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{error}</p>
          : <div style={{ display:"flex", alignItems:"center", gap:8 }}><RefreshCw size={16} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:13 }}>평가 대상자를 불러오는 중...</span></div>}
      </div>
    );
  }
  if (teammates.length===0) {
    return <div style={{ padding:"28px 32px" }}><p style={{ fontSize:13, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>평가할 팀원이 없습니다. 먼저 팀에 참여해주세요.</p></div>;
  }

  const progress = Math.round((done.length/teammates.length)*100);

  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:4 }}>팀원 평가</h1>
        <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:12 }}>{teamName} — 프로젝트 종료 후 평가</p>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1 }}><Progress value={progress} color={progress===100?"#34d399":"#00c8ff"}/></div>
          <span style={{ fontSize:12, fontFamily:"'Orbitron',monospace", color:progress===100?"#34d399":"#00c8ff", fontWeight:700 }}>{done.length}/{teammates.length}</span>
        </div>
      </div>
      {error && <p style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'", marginBottom:14 }}>{error}</p>}
      {progress===100 && (
        <div style={{ padding:"14px 18px", borderRadius:10, background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.3)", marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
          <CheckCircle2 size={18} style={{color:"#34d399"}}/>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:"#34d399", fontFamily:"'Noto Sans KR'" }}>모든 평가를 완료했습니다!</p>
            <p style={{ fontSize:11, color:"#34d399", fontFamily:"'Noto Sans KR'", opacity:0.7 }}>이제 모든 카드의 상세 정보를 확인할 수 있습니다.</p>
          </div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {teammates.map(u=>{
          const isDone=done.includes(u.userId);
          const uRatings = ratings[u.userId];
          const sum = statsSum(uRatings);
          const sumValid = sum>=6 && sum<=40;
          return (
            <div key={u.userId} style={{ ...DS.card, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", background:isDone?"rgba(52,211,153,0.04)":"rgba(255,255,255,0.01)", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:999, overflow:"hidden", border:"2px solid #00c8ff", flexShrink:0 }}><img src={u.profileImageUrl || FALLBACK_AVATAR} alt={u.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#00c8ff" }}>{u.name}</div>
                </div>
                {isDone && <Pill label="✓ 완료" color="#34d399" small/>}
              </div>
              {!isDone && (
                <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}>
                  <div>
                    <p style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:8 }}>칭호 선택 <span style={{color:"#4a5a7a"}}>(1개 선택)</span></p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {(titleOptions??[]).map(t=>{
                        const sel=titles[u.userId]===t.id;
                        return <button key={t.id} onClick={()=>setTitles(p=>({...p,[u.userId]:t.id}))} style={{ padding:"4px 10px", borderRadius:999, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s", background:sel?"rgba(0,200,255,0.15)":"rgba(255,255,255,0.03)", color:sel?"#00c8ff":"#8899bb", border:`1px solid ${sel?"rgba(0,200,255,0.4)":"rgba(255,255,255,0.07)"}` }}>{t.name}</button>;
                      })}
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 24px" }}>
                    {STATS.map(s=>(
                      <StatSlider key={s.key} label={s.label} desc={s.desc} value={(ratings[u.userId]?.[s.key as keyof Stats]??5) as number} onChange={v=>setR(u.userId,s.key,v)} color={s.color} Icon={s.Icon}/>
                    ))}
                  </div>
                  <div style={{ padding:"12px", borderRadius:10, background:"rgba(0,200,255,0.04)", border:"1px solid rgba(0,200,255,0.1)", position:"relative" }}>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      <MiniHex stats={Object.fromEntries(STATS.map(s=>[s.key,((uRatings?.[s.key as keyof Stats])??5)*10])) as unknown as Stats} size={90} color="#00c8ff"/>
                    </div>
                    <span style={{ position:"absolute", left:14, bottom:12, fontSize:18, fontFamily:"'Orbitron',monospace", fontWeight:800, color: sumValid?"#00c8ff":"#ef4444" }}>{sum}</span>
                  </div>
                  {!sumValid && <span style={{ fontSize:11, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>능력치 총합을 6-40 사이로 설정해주세요.</span>}
                  <div style={{ display:"flex", justifyContent:"flex-end" }}>
                    <Btn disabled={!titles[u.userId]||submitting===u.userId||!sumValid} onClick={()=>submit(u.userId)} icon={<Check size={13}/>}>{submitting===u.userId?"제출 중...":"평가 제출"}</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
