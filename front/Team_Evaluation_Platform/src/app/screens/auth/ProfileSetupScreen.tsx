import { useState, useRef } from "react";
import { Check, Camera, CheckCircle2, RefreshCw } from "lucide-react";
import {
  updateProfile as apiUpdateProfile, setInitialStats as apiSetInitialStats,
  uploadProfileImage as apiUploadProfileImage, ApiError,
} from "../../api";
import { STATS } from "../../constants/stats";
import { validateProfileImage } from "../../lib/imageValidation";
import { handleImgError } from "../../lib/avatar";
import { DS } from "../../design-system/tokens";
import { Btn, StatSlider } from "../../design-system/primitives";
import { MiniHex } from "../../design-system/HexChart";
import type { Stats } from "../../types";

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
    <div style={{ minHeight:"100vh", background:"#070b12", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 70% 50%, rgba(0,200,255,0.05) 0%, transparent 60%)" }}/>
      <div style={{ ...DS.card, width:460, padding:"38px 36px", position:"relative", zIndex:1 }}>
        {/* Stepper */}
        <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28 }}>
          {["프로필 사진","자기소개","초기 능력치"].map((s,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", flex:i<2?1:undefined }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:26, height:26, borderRadius:999, border:`2px solid ${i<=stepIdx?"#00c8ff":"rgba(255,255,255,0.15)"}`, background:i<stepIdx?"#00c8ff":i===stepIdx?"rgba(0,200,255,0.15)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>
                  {i<stepIdx?<Check size={13} style={{color:"#060c18"}}/>:<span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:i<=stepIdx?"#00c8ff":"#4a5a7a" }}>{i+1}</span>}
                </div>
                <span style={{ fontSize:10, color:i===stepIdx?"#00c8ff":"#4a5a7a", fontFamily:"'Noto Sans KR'", whiteSpace:"nowrap" }}>{s}</span>
              </div>
              {i<2 && <div style={{ flex:1, height:1, background:i<stepIdx?"#00c8ff":"rgba(255,255,255,0.1)", margin:"0 8px", marginBottom:18, transition:"background 0.3s" }}/>}
            </div>
          ))}
        </div>

        {step==="photo" && (
          <div onKeyDown={e=>handleEnterKey(e,()=>{ if(!photoUploading) setStep("bio"); })} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display:"none" }}
              onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoSelected(f); e.target.value=""; }}/>
            <div
              onClick={()=>!photoUploading&&fileInputRef.current?.click()}
              style={{ width:120, height:120, borderRadius:999, border:`2px dashed ${photoUrl?"rgba(52,211,153,0.6)":"rgba(0,200,255,0.3)"}`, background:"rgba(0,200,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", cursor:photoUploading?"wait":"pointer", position:"relative", overflow:"hidden", transition:"all 0.2s" }}
            >
              {photoUploading
                ? <RefreshCw size={24} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/>
                : photoUrl
                ? <img src={photoUrl} alt="" onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:999 }}/>
                : <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <Camera size={28} style={{color:"#00c8ff"}}/>
                    <span style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>클릭하여 업로드</span>
                  </div>
              }
            </div>
            {photoUrl && <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#34d399", fontFamily:"'Noto Sans KR'" }}><CheckCircle2 size={14}/>사진이 설정되었습니다</div>}
            {err && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>}
            <div style={{ width:"100%", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Btn full variant="ghost" onClick={()=>setStep("bio")} disabled={photoUploading}>나중에 설정</Btn>
              <Btn full onClick={()=>setStep("bio")} disabled={photoUploading}>다음</Btn>
            </div>
          </div>
        )}

        {step==="bio" && (
          <div onKeyDown={e=>handleEnterKey(e,()=>{ if(!loading) saveBioAndContinue(); })} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>한줄 자기소개</span>
                <span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:bio.length>45?"#ef4444":"#4a5a7a" }}>{bio.length}/50</span>
              </div>
              <textarea
                value={bio}
                onChange={e=>e.target.value.length<=50&&setBio(e.target.value)}
                placeholder="나를 한 문장으로 소개한다면?"
                rows={3}
                style={{ ...DS.input, width:"100%", padding:"11px 14px", resize:"none", fontFamily:"'Noto Sans KR'", fontSize:14, lineHeight:1.6, boxSizing:"border-box" }}
              />
            </div>
            {err && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Btn full variant="ghost" onClick={()=>setStep("photo")}>이전</Btn>
              <Btn full onClick={saveBioAndContinue} disabled={loading}>{loading?"저장 중...":"다음"}</Btn>
            </div>
          </div>
        )}

        {step==="stats" && (
          <div onKeyDown={e=>handleEnterKey(e,()=>{ if(!loading&&statsValid) saveStatsAndFinish(); })} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'", marginBottom:2 }}>자신의 초기 능력치를 입력하세요 (1-10)</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 24px" }}>
              {STATS.map(s=>(
                <StatSlider key={s.key} label={s.label} desc={s.desc} value={stats[s.key as keyof typeof stats]} onChange={v=>setStats(p=>({...p,[s.key]:v}))} color={s.color} Icon={s.Icon}/>
              ))}
            </div>
            <div style={{ padding:"12px", borderRadius:10, background:"rgba(0,200,255,0.04)", border:"1px solid rgba(0,200,255,0.1)", marginTop:4, position:"relative" }}>
              <div style={{ display:"flex", justifyContent:"center" }}>
                <MiniHex stats={Object.fromEntries(STATS.map(s=>[s.key, stats[s.key as keyof typeof stats]*10])) as unknown as Stats} size={100} color="#00c8ff"/>
              </div>
              <span style={{ position:"absolute", left:14, bottom:12, fontSize:20, fontFamily:"'Orbitron',monospace", fontWeight:800, color: statsValid?"#00c8ff":"#ef4444" }}>{statSum}</span>
            </div>
            {!statsValid && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>초기 능력치 총합을 6-40 사이로 설정해주세요.</span>}
            {err && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Btn full variant="ghost" onClick={()=>setStep("bio")}>이전</Btn>
              <Btn full variant="purple" onClick={saveStatsAndFinish} disabled={loading||!statsValid} icon={loading?undefined:<CheckCircle2 size={14}/>}>{loading?"저장 중...":"완료"}</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
