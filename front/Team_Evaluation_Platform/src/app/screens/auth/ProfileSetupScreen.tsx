import { useState, useRef } from "react";
import {
  updateProfile as apiUpdateProfile, setInitialStats as apiSetInitialStats,
  uploadProfileImage as apiUploadProfileImage, ApiError,
} from "../../api";
import { STATS } from "../../constants/stats";
import { validateProfileImage } from "../../lib/imageValidation";
import { handleImgError } from "../../lib/avatar";
import { InfoTooltip } from "../../design-system/primitives";
import {
  OBS, ObservatoryStyle, SpaceBackground, ObsPanel, ObsButton, ObsError, ObsGauge,
  ConstellationChart, MonoLabel,
} from "../../design-system/observatory";

const STEP_LABELS = [
  { en: "01 PORTRAIT", kr: "프로필 사진" },
  { en: "02 SIGNAL", kr: "자기소개" },
  { en: "03 SPECTRUM", kr: "초기 능력치" },
];

export function ProfileSetupScreen({ onDone }: { onDone:()=>void }) {
  const [step, setStep] = useState<"photo"|"bio"|"stats">("photo");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string|null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [stats, setStats] = useState({attack:5,defense:5,agility:5,teamwork:5,health:5,mana:5});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const steps = ["photo","bio","stats"];
  const stepIdx = steps.indexOf(step);
  const statSum = STATS.reduce((sum,s)=>sum+stats[s.key as keyof typeof stats],0);
  const statsValid = statSum>=6 && statSum<=40;

  function handleEnterKey(e: React.KeyboardEvent, action: ()=>void) {
    if (e.key!=="Enter" || (e.target as HTMLElement).tagName==="TEXTAREA") return;
    e.preventDefault();
    action();
  }

  async function handlePhotoSelected(file: File) {
    const invalid = validateProfileImage(file);
    if (invalid) { setErr(invalid); return; }
    setErr(""); setPhotoUploading(true);
    try {
      const profile = await apiUploadProfileImage(file);
      setPhotoUrl(profile.profileImageUrl);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function saveBioAndContinue() {
    setErr(""); setLoading(true);
    try {
      await apiUpdateProfile({ biography: bio });
      setStep("stats");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "자기소개 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveStatsAndFinish() {
    setErr(""); setLoading(true);
    try {
      await apiSetInitialStats(stats);
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.errorCode === "INITIAL_STATS_ALREADY_SET") { onDone(); return; }
      setErr(e instanceof ApiError ? e.message : "초기 능력치 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", position:"relative", overflow:"hidden", background:OBS.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <ObservatoryStyle/>
      <SpaceBackground/>

      <div style={{ position:"absolute", top:26, left:32, display:"flex", alignItems:"baseline", gap:14, animation:"obsFadeIn 1.2s both", pointerEvents:"none" }}>
        <span style={{ fontFamily:OBS.display, fontWeight:600, fontSize:14, letterSpacing:5, color:OBS.starWhite }}>MADNOVA</span>
        <MonoLabel size={10} spacing={3}>DEEP-SKY OBSERVATORY</MonoLabel>
      </div>
      <div style={{ position:"absolute", bottom:26, left:32, animation:"obsFadeIn 1.2s both", pointerEvents:"none" }}>
        <MonoLabel size={10} spacing={2.5}><span style={{ color:OBS.teal }}>◉</span> NEW STAR REGISTRATION IN PROGRESS</MonoLabel>
      </div>

      <div style={{ position:"relative", zIndex:1, animation:"obsFadeUp 1s both" }}>
        <ObsPanel width={480} style={{ padding:"24px 30px 28px", maxHeight:"88vh", overflowY:"auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <MonoLabel size={9.5} spacing={3.5} color={OBS.teal}>STAR REGISTRATION</MonoLabel>
            <MonoLabel size={9.5} spacing={2}>AUTH-03</MonoLabel>
          </div>

          {/* Stepper: 별자리처럼 점선으로 이어진 별 노드 */}
          <div style={{ display:"flex", alignItems:"flex-start", marginBottom:26 }}>
            {STEP_LABELS.map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"flex-start", flex:i<2?1:undefined }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
                  <div style={{
                    width:9, height:9, borderRadius:"50%", marginTop:2,
                    background: i<stepIdx ? OBS.teal : i===stepIdx ? OBS.starWhite : "rgba(125,180,255,.18)",
                    boxShadow: i<stepIdx
                      ? "0 0 8px 2px rgba(94,234,212,.6)"
                      : i===stepIdx ? "0 0 12px 4px rgba(160,200,255,.55)" : "none",
                    animation: i===stepIdx ? "obsStarBreathe 2.6s ease-in-out infinite" : undefined,
                    transition:"background .3s, box-shadow .3s",
                  }}/>
                  <div style={{ textAlign:"center" }}>
                    <div><MonoLabel size={8.5} spacing={2} color={i===stepIdx?OBS.sky:i<stepIdx?OBS.teal:OBS.faint}>{s.en}</MonoLabel></div>
                    <div style={{ fontSize:10.5, fontWeight:300, color:i===stepIdx?OBS.body:OBS.faint, fontFamily:OBS.kr, marginTop:2, whiteSpace:"nowrap" }}>{s.kr}</div>
                  </div>
                </div>
                {i<2 && (
                  <div style={{
                    flex:1, height:0, margin:"6px 10px 0",
                    borderTop:`1px dashed ${i<stepIdx?"rgba(94,234,212,.5)":"rgba(140,175,235,.2)"}`,
                    transition:"border-color .3s",
                  }}/>
                )}
              </div>
            ))}
          </div>

          {step==="photo" && (
            <div onKeyDown={e=>handleEnterKey(e,()=>{ if(!photoUploading&&photoUrl) setStep("bio"); })} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:18, animation:"obsFadeUp .6s both" }}>
              <p style={{ fontSize:12.5, fontWeight:300, lineHeight:1.7, color:OBS.sub, fontFamily:OBS.kr, margin:0, textAlign:"center" }}>
                관측 기록에 남을 별의 모습을 등록하세요.
              </p>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display:"none" }}
                onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoSelected(f); e.target.value=""; }}/>
              {/* 궤도 링이 도는 원형 업로드 슬롯 */}
              <div style={{ position:"relative", width:152, height:152, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ position:"absolute", left:"50%", top:"50%", width:148, height:148, transform:"translate(-50%,-50%)", border:"1px dashed rgba(125,180,255,.35)", borderRadius:"50%", animation:"obsSpinC 22s linear infinite" }}>
                  <div style={{ position:"absolute", top:-3, left:"50%", width:6, height:6, borderRadius:"50%", background:OBS.teal, boxShadow:"0 0 8px 2px rgba(94,234,212,.7)" }}/>
                  <div style={{ position:"absolute", bottom:8, right:4, width:4, height:4, borderRadius:"50%", background:OBS.violet, boxShadow:"0 0 6px 2px rgba(167,139,250,.7)" }}/>
                </div>
                <div
                  onClick={()=>!photoUploading&&fileInputRef.current?.click()}
                  style={{
                    width:118, height:118, borderRadius:"50%", overflow:"hidden", position:"relative",
                    border: photoUrl ? "1px solid rgba(94,234,212,.5)" : "1px solid rgba(125,180,255,.3)",
                    background:"rgba(125,180,255,.05)",
                    boxShadow: photoUrl ? "0 0 28px rgba(94,234,212,.3)" : "0 0 20px rgba(125,190,255,.15)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor: photoUploading ? "wait" : "pointer", transition:"border-color .3s, box-shadow .3s",
                  }}
                >
                  {photoUploading
                    ? <div style={{ animation:"obsBlinkDim 1.1s ease-in-out infinite" }}><MonoLabel size={9} spacing={2} color={OBS.teal}>⌁ UPLOADING…</MonoLabel></div>
                    : photoUrl
                    ? <img src={photoUrl} alt="" onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                        <span style={{ color:OBS.sky, fontSize:15 }}>◉</span>
                        <span style={{ fontSize:11, fontWeight:300, color:OBS.dim, fontFamily:OBS.kr }}>클릭하여 업로드</span>
                      </div>
                  }
                </div>
              </div>
              {photoUrl && (
                <div style={{ textAlign:"center", animation:"obsFadeIn .5s both" }}>
                  <MonoLabel size={9} spacing={2.5} color={OBS.teal}>✦ PORTRAIT ACQUIRED</MonoLabel>
                  <div style={{ fontSize:11.5, fontWeight:300, color:OBS.sub, fontFamily:OBS.kr, marginTop:3 }}>사진이 설정되었습니다</div>
                </div>
              )}
              {err && <div style={{ width:"100%" }}><ObsError>{err}</ObsError></div>}
              <div style={{ width:"100%", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:2 }}>
                <ObsButton variant="ghost" onClick={()=>setStep("bio")} disabled={photoUploading}>SKIP · 나중에 설정</ObsButton>
                <ObsButton onClick={()=>setStep("bio")} disabled={photoUploading||!photoUrl}>NEXT · 다음</ObsButton>
              </div>
            </div>
          )}

          {step==="bio" && (
            <div onKeyDown={e=>handleEnterKey(e,()=>{ if(!loading) saveBioAndContinue(); })} style={{ display:"flex", flexDirection:"column", gap:16, animation:"obsFadeUp .6s both" }}>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <MonoLabel size={9.5} spacing={2.5}>SIGNAL MESSAGE <span style={{ color:OBS.faint }}>· 한줄 자기소개</span></MonoLabel>
                  <MonoLabel size={9.5} spacing={1} color={bio.length>45?"#f87171":OBS.faint}>{bio.length}/50</MonoLabel>
                </div>
                <textarea
                  className="obs-input"
                  value={bio}
                  onChange={e=>e.target.value.length<=50&&setBio(e.target.value)}
                  placeholder="나를 한 문장으로 소개한다면?"
                  rows={3}
                  style={{ width:"100%", padding:"11px 13px", resize:"none", fontSize:13.5, lineHeight:1.7, boxSizing:"border-box" }}
                />
              </div>
              {err && <ObsError>{err}</ObsError>}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <ObsButton variant="ghost" onClick={()=>setStep("photo")}>BACK · 이전</ObsButton>
                <ObsButton onClick={saveBioAndContinue} disabled={loading} blink={loading}>{loading?"⌁ TRANSMITTING…":"NEXT · 다음"}</ObsButton>
              </div>
            </div>
          )}

          {step==="stats" && (
            <div onKeyDown={e=>handleEnterKey(e,()=>{ if(!loading&&statsValid) saveStatsAndFinish(); })} style={{ display:"flex", flexDirection:"column", gap:14, animation:"obsFadeUp .6s both" }}>
              <div>
                <MonoLabel size={9.5} spacing={2.5}>SPECTRAL CALIBRATION <span style={{ color:OBS.faint }}>· 초기 능력치</span></MonoLabel>
                <p style={{ fontSize:12, fontWeight:300, lineHeight:1.7, color:OBS.sub, fontFamily:OBS.kr, margin:"6px 0 0" }}>
                  각 특성의 세기를 기록하세요 (1–10). 기록은 별의 스펙트럼에 반영됩니다.
                </p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                {STATS.map(s=>{
                  const v = stats[s.key as keyof typeof stats];
                  const labelNode = (
                    <div style={{ width:96, flexShrink:0, userSelect:"none" }}>
                      <div><MonoLabel size={9} spacing={2} color={OBS.sky}>{s.en}</MonoLabel></div>
                      <div style={{ fontSize:12, fontWeight:300, color:OBS.body, fontFamily:OBS.kr }}>{s.label}</div>
                    </div>
                  );
                  return (
                    <div key={s.key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                      {s.desc ? <InfoTooltip text={s.desc}>{labelNode}</InfoTooltip> : labelNode}
                      <ObsGauge value={v} onChange={nv=>setStats(p=>({...p,[s.key]:nv}))}/>
                      <div style={{ width:24, textAlign:"right" }}>
                        <MonoLabel size={11} spacing={0} color={OBS.teal}>{v}</MonoLabel>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* 실시간 별자리 프리뷰 + 총합 */}
              <div style={{ display:"flex", justifyContent:"center", margin:"2px 0" }}>
                <ConstellationChart
                  size={216}
                  frac={STATS.map(s=>stats[s.key as keyof typeof stats]/10)}
                  labels={STATS.map(s=>({ en:s.en, kr:`${s.label} ${stats[s.key as keyof typeof stats]}` }))}
                />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid rgba(125,180,255,.12)", paddingTop:13 }}>
                <MonoLabel size={9.5} spacing={2.5}>TOTAL FLUX <span style={{ color:OBS.faint }}>· 총합 6–40</span></MonoLabel>
                <span style={{ fontFamily:OBS.display, fontSize:19, fontWeight:500, color:statsValid?OBS.starWhite:"#f87171", textShadow:statsValid?"0 0 14px rgba(125,211,252,.5)":"none" }}>{statSum}</span>
              </div>
              {!statsValid && <ObsError>초기 능력치 총합을 6-40 사이로 설정해주세요.</ObsError>}
              {err && <ObsError>{err}</ObsError>}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <ObsButton variant="ghost" onClick={()=>setStep("bio")}>BACK · 이전</ObsButton>
                <ObsButton onClick={saveStatsAndFinish} disabled={loading||!statsValid} blink={loading}>
                  {loading?"⌁ TRANSMITTING…":"✦ COMPLETE · 등록 완료"}
                </ObsButton>
              </div>
            </div>
          )}
        </ObsPanel>
      </div>
    </div>
  );
}
