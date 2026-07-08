import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import {
  listEvaluationTargets, listTitles, submitEvaluation, ApiError,
  type EvaluationTargetDto, type TitleDto,
} from "../../api";
import type { Stats } from "../../types";
import { STATS } from "../../constants/stats";
import { FALLBACK_AVATAR } from "../../lib/avatar";
import { useIsMobile } from "../../lib/useIsMobile";
import { SPACE, FONT, observatoryCode } from "../../design-system/space";
import { SpaceBackground } from "../../design-system/SpaceBackground";
import { HoloPanel } from "../../design-system/HoloPanel";
import { HudLabel } from "../../design-system/HudLabel";
import { StarPortrait } from "../../design-system/StarPortrait";
import { ConstellationChart } from "../../design-system/ConstellationChart";
import { InfoTooltip } from "../../design-system/primitives";

function centerMessage(text: string, spinning = false) {
  return (
    <div style={{ position:"relative", height:"100%" }}>
      <SpaceBackground/>
      <div style={{ position:"relative", zIndex:1, height:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        {spinning && <RefreshCw size={16} style={{ color:SPACE.accentSky, animation:"spin 1s linear infinite" }}/>}
        <span style={{ color:SPACE.textDim, fontFamily:FONT.body, fontSize:13 }}>{text}</span>
      </div>
    </div>
  );
}

// design.md §85: 특성별 10칸 세그먼트 게이지 — 클릭 입력, 채워진 칸은 하늘색→청록
// 그라데이션 + 글로우. 슬라이더 대신 관측 계기판의 눈금처럼 보이게 한다.
function SegmentGauge({ en, kr, desc, value, onChange }: {
  en:string; kr:string; desc?:string; value:number; onChange:(v:number)=>void;
}) {
  // 모바일은 폭이 좁아 [라벨+수치] 위, 게이지 아래의 2단으로 쌓는다.
  const isMobile = useIsMobile();
  const labelNode = isMobile ? (
    <div style={{ display:"flex", alignItems:"baseline", gap:8, userSelect:"none" }}>
      <span style={{ fontFamily:FONT.hud, fontSize:9, letterSpacing:"2px", color:SPACE.accentSky }}>{en}</span>
      <span style={{ fontSize:12.5, color:SPACE.text, fontFamily:FONT.body }}>{kr}</span>
    </div>
  ) : (
    <div style={{ width:104, flex:"none", userSelect:"none" }}>
      <div style={{ fontFamily:FONT.hud, fontSize:9, letterSpacing:"2px", color:SPACE.accentSky }}>{en}</div>
      <div style={{ fontSize:12.5, color:SPACE.text, fontFamily:FONT.body }}>{kr}</div>
    </div>
  );
  const labeled = desc ? <InfoTooltip text={desc}>{labelNode}</InfoTooltip> : labelNode;
  const gauge = (
    <div style={{ display:"flex", gap:4, flex:1 }}>
      {Array.from({ length:10 }, (_, i) => {
        const filled = i < value;
        return (
          <div key={i} onClick={()=>onChange(i+1)} style={{
            flex:1, maxWidth: isMobile ? undefined : 20, height:10, cursor:"pointer", borderRadius:1,
            background: filled ? SPACE.buttonGradient : "rgba(125,180,255,.1)",
            boxShadow: filled ? "0 0 7px rgba(94,234,212,.4)" : "none",
            transition:"background .25s, box-shadow .25s",
          }}/>
        );
      })}
    </div>
  );
  if (isMobile) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {labeled}
          <span style={{ fontFamily:FONT.hud, fontSize:11, color:SPACE.accentSky }}>{value}</span>
        </div>
        {gauge}
      </div>
    );
  }
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      {labeled}
      {gauge}
      <div style={{ width:26, textAlign:"right", fontFamily:FONT.hud, fontSize:11, color:SPACE.accentSky }}>{value}</div>
    </div>
  );
}

// ─── Evaluate Screen (design.md §84: 평가 = 관측) ─────────────────────────────
export function EvaluateScreen({ onDone }: { onDone:()=>void }) {
  const isMobile = useIsMobile();
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
    return error ? centerMessage(error) : centerMessage("관측 대상을 탐색하는 중...", true);
  }
  if (teammates.length===0) {
    return centerMessage("관측할 별이 없습니다. 먼저 팀에 참여해주세요.");
  }

  const progress = Math.round((done.length/teammates.length)*100);
  const allLogged = progress===100;

  return (
    <div style={{ position:"relative", height:"100%", overflow:"hidden" }}>
      <SpaceBackground/>
      <div style={{ position:"absolute", inset:0, zIndex:1, overflowY:"auto", padding: isMobile ? "22px 16px 34px" : "36px 40px 48px", boxSizing:"border-box" }}>
        {/* 헤더: HUD 라벨 + 진행 게이지 */}
        <div style={{ maxWidth:760, marginBottom:26 }}>
          <div style={{ fontFamily:FONT.hud, fontSize:10, letterSpacing:"3px", color:SPACE.label, textTransform:"uppercase", marginBottom:6 }}>
            OBSERVATION MODE{teamName && <span style={{ color:SPACE.faint }}> · GALAXY {teamName}</span>}
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk', 'Noto Sans KR', sans-serif", fontSize:26, fontWeight:500, color:SPACE.starWhite2, letterSpacing:"0.5px", margin:0 }}>
            별을 관측합니다
          </h1>
          <p style={{ margin:"6px 0 16px", fontSize:12.5, fontWeight:300, lineHeight:1.7, color:SPACE.textDim, fontFamily:FONT.body }}>
            프로젝트를 함께한 별들의 스펙트럼을 기록하세요. 기록은 각 별의 별자리에 반영됩니다.
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ flex:1, height:2, background:"rgba(125,180,255,.14)", overflow:"hidden" }}>
              <div style={{ width:`${progress}%`, height:"100%", background:SPACE.buttonGradient, boxShadow:"0 0 8px rgba(94,234,212,.5)", transition:"width .4s ease" }}/>
            </div>
            <span style={{ fontFamily:FONT.hud, fontSize:10.5, letterSpacing:"2px", color:allLogged?SPACE.accentTeal:SPACE.accentSky }}>
              {done.length}/{teammates.length} LOGGED
            </span>
          </div>
        </div>

        {error && <p style={{ maxWidth:760, fontSize:12, color:"#f87171", fontFamily:FONT.body, marginBottom:14 }}>{error}</p>}

        {allLogged && (
          <div style={{ maxWidth:760, boxSizing:"border-box", padding:"16px 20px", borderRadius:3, background:"rgba(94,234,212,.06)", border:"1px solid rgba(94,234,212,.35)", marginBottom:22, animation:"fadeUp .6s both" }}>
            <div style={{ fontFamily:FONT.hud, fontSize:11, letterSpacing:"3px", color:SPACE.accentTeal, marginBottom:5 }}>
              <span style={{ textShadow:"0 0 12px rgba(94,234,212,.8)" }}>✦</span> ALL OBSERVATIONS LOGGED
            </div>
            <p style={{ margin:0, fontSize:12, fontWeight:300, color:SPACE.textDim, fontFamily:FONT.body }}>
              모든 관측이 완료되었습니다. 이제 모든 별의 상세 스펙트럼을 확인할 수 있습니다.
            </p>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:760 }}>
          {teammates.map((u,idx)=>{
            const isDone=done.includes(u.userId);
            const uRatings = ratings[u.userId];
            const sum = statsSum(uRatings);
            const sumValid = sum>=6 && sum<=40;
            const canTransmit = !!titles[u.userId] && sumValid && submitting!==u.userId;
            return (
              <HoloPanel key={u.userId} style={{ padding:0, animation:`fadeUp .6s ${idx*0.08}s both` }}>
                {/* 대상 별 식별부 */}
                <div style={{ display:"flex", alignItems:"center", gap:16, padding: isMobile ? "14px 16px" : "16px 22px", borderBottom:isDone?"none":`1px solid ${SPACE.border}` }}>
                  {/* 프로필 테두리는 팀 관리 페이지와 동일하게 하늘색 하나로 통일 */}
                  <StarPortrait photo={u.profileImageUrl || FALLBACK_AVATAR} size={46}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:FONT.hud, fontSize:9, letterSpacing:"2px", color:SPACE.label, marginBottom:3 }}>{observatoryCode(u.userId)}</div>
                    <div style={{ fontFamily:"'Space Grotesk', 'Noto Sans KR', sans-serif", fontSize:17, fontWeight:500, color:SPACE.starWhite }}>{u.name}</div>
                  </div>
                  {isDone
                    ? <span style={{ fontFamily:FONT.hud, fontSize:9.5, letterSpacing:"2.5px", color:SPACE.accentTeal }}>✦ LOGGED</span>
                    : <span style={{ fontFamily:FONT.hud, fontSize:9.5, letterSpacing:"2.5px", color:SPACE.faint }}>AWAITING SCAN</span>}
                </div>

                {isDone ? (
                  <div style={{ padding:"14px 22px 18px" }}>
                    <span style={{ fontSize:12, fontWeight:300, color:SPACE.label, fontFamily:FONT.body }}>관측 기록이 저장되었습니다.</span>
                  </div>
                ) : (
                  <div style={{ padding: isMobile ? "18px 16px 18px" : "20px 22px 22px", display:"flex", flexDirection:"column", gap:20 }}>
                    {/* 칭호 = 별자리 조각 선택 */}
                    <div>
                      <HudLabel en="CONSTELLATION FRAGMENT" kr="칭호 선택 (1개)"/>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                        {(titleOptions??[]).map(t=>{
                          const sel=titles[u.userId]===t.id;
                          return (
                            <button key={t.id} onClick={()=>setTitles(p=>({...p,[u.userId]:t.id}))} style={{
                              display:"inline-flex", alignItems:"center", gap:5, cursor:"pointer",
                              padding:"5px 11px 5px 9px", borderRadius:3, transition:"all .2s",
                              fontSize:12, fontFamily:FONT.body,
                              background: sel ? "rgba(94,234,212,.1)" : "rgba(125,180,255,.04)",
                              color: sel ? SPACE.starWhite : SPACE.textDim,
                              border: `1px solid ${sel ? "rgba(94,234,212,.55)" : "rgba(125,180,255,.18)"}`,
                              boxShadow: sel ? "0 0 12px rgba(94,234,212,.22)" : "none",
                            }}>
                              <span style={{ color: sel ? SPACE.accentTeal : SPACE.faint }}>✦—</span>{t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 특성별 세그먼트 게이지 */}
                    <div>
                      <HudLabel en="SPECTRAL READING" kr="특성별 관측 세기"/>
                      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        {STATS.map(s=>(
                          <SegmentGauge key={s.key} en={s.en} kr={s.label} desc={s.desc}
                            value={(uRatings?.[s.key as keyof Stats]??5) as number}
                            onChange={v=>setR(u.userId,s.key,v)}/>
                        ))}
                      </div>
                    </div>

                    {/* 실시간 별자리 프리뷰 + 총합 */}
                    <div style={{ border:`1px solid ${SPACE.border}`, borderRadius:3, background:"rgba(125,180,255,.03)", padding:"14px 18px 6px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                        <HudLabel en="SPECTRAL PREVIEW" kr="실시간 별자리"/>
                        <span style={{ fontFamily:FONT.hud, fontSize:11, letterSpacing:"1px", color:sumValid?SPACE.accentTeal:"#f87171" }}>
                          TOTAL {sum} <span style={{ color:SPACE.faint }}>/ 6–40</span>
                        </span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"center" }}>
                        <ConstellationChart size={190} animate={false}
                          stats={Object.fromEntries(STATS.map(s=>[s.key,((uRatings?.[s.key as keyof Stats])??5)*10])) as unknown as Stats}/>
                      </div>
                    </div>
                    {!sumValid && <span style={{ fontSize:11.5, color:"#f87171", fontFamily:FONT.body }}>능력치 총합을 6-40 사이로 설정해주세요.</span>}

                    {/* 기록 전송 */}
                    <button onClick={()=>submit(u.userId)} disabled={!canTransmit} style={{
                      width:"100%", padding:"13px 0", borderRadius:2, textAlign:"center",
                      fontFamily:FONT.hud, fontSize:10.5, letterSpacing:"2.5px",
                      cursor: canTransmit ? "pointer" : "not-allowed", transition:"all .4s",
                      background: canTransmit ? SPACE.buttonGradient : "rgba(125,180,255,.06)",
                      color: canTransmit ? SPACE.bgDeep : SPACE.label,
                      border: canTransmit ? "none" : `1px solid ${SPACE.border}`,
                      boxShadow: canTransmit ? "0 0 22px rgba(94,234,212,.3)" : "none",
                      animation: submitting===u.userId ? "blinkDim 1s ease-in-out infinite" : undefined,
                    }}>
                      {submitting===u.userId ? "⌁ TRANSMITTING…" : "⌁ TRANSMIT RECORD · 기록 전송"}
                    </button>
                  </div>
                )}
              </HoloPanel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
