import { useState, useEffect, useRef } from "react";
import { RefreshCw, Upload, CheckCircle2 } from "lucide-react";
import {
  getMyProfile, getCard, updateProfile as apiUpdateProfile, uploadProfileImage as apiUploadProfileImage,
  ApiError, type UserProfileDto,
} from "../../api";
import type { User } from "../../types";
import { STATS } from "../../constants/stats";
import { RARITY } from "../../constants/rarity";
import { ZERO_STATS, dtoStatsToStats, rarityFromPower, totalPower, cardToUser } from "../../lib/cardMapping";
import { validateProfileImage } from "../../lib/imageValidation";
import { FALLBACK_AVATAR, handleImgError } from "../../lib/avatar";
import { DS } from "../../design-system/tokens";
import { Btn, InfoTooltip } from "../../design-system/primitives";
import { BigHex } from "../../design-system/HexChart";
import { FlipCard } from "../../components/Card";

// ─── Profile Screen ───────────────────────────────────────────────────────────
export function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfileDto|null>(null);
  const [card, setCard] = useState<User|null>(null);
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    (async () => {
      try {
        const me = await getMyProfile();
        setProfile(me);
        setBio(me.biography ?? "");
        const detail = await getCard(me.id);
        const built = cardToUser(detail);
        // 내 프로필은 (다른 사람 카드와 달리) 평가 완료 여부와 무관하게 항상 볼 수 있어야 하므로,
        // 도감 잠금으로 stats가 null로 내려온 경우 /users/me가 주는 내 실제 능력치로 대체한다.
        const myStats = me.stats ? dtoStatsToStats(me.stats) : ZERO_STATS;
        setCard(detail.isUnlocked ? built : { ...built, stats: myStats, rarity: me.stats ? rarityFromPower(totalPower(myStats)) : "common" });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "프로필을 불러오지 못했습니다.");
      }
    })();
  },[]);

  async function save() {
    setSaving(true); setError("");
    try {
      await apiUpdateProfile({ biography: bio });
      setSaved(true); setTimeout(()=>setSaved(false),2000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoSelected(file: File) {
    const invalid = validateProfileImage(file);
    if (invalid) { setPhotoError(invalid); return; }
    setPhotoError(""); setPhotoUploading(true);
    try {
      const updated = await apiUploadProfileImage(file);
      setProfile(updated);
      setCard(c => c ? { ...c, photo: updated.profileImageUrl || FALLBACK_AVATAR } : c);
    } catch (e) {
      setPhotoError(e instanceof ApiError ? e.message : "사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setPhotoUploading(false);
    }
  }

  if (error) return <div style={{ padding:"28px 32px" }}><p style={{ color:"#ef4444", fontFamily:"'Noto Sans KR'", fontSize:13 }}>{error}</p></div>;
  if (!profile || !card) return <div style={{ padding:"28px 32px", display:"flex", alignItems:"center", gap:8 }}><RefreshCw size={16} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:13 }}>프로필을 불러오는 중...</span></div>;

  const u = card; const r = RARITY[u.rarity];
  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:24 }}>내 프로필</h1>
      <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
        {/* Left: card preview */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, alignItems:"flex-start" }}>
          <p style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>내 카드 미리보기</p>
          <FlipCard user={u} w={220} h={340}/>
          <p style={{ fontSize:10, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>클릭하여 앞/뒤 확인</p>
        </div>
        {/* Right: edit */}
        <div style={{ flex:1, minWidth:280, display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:14 }}>프로필 수정</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Photo */}
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display:"none" }}
                  onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoSelected(f); e.target.value=""; }}/>
                <div style={{ width:56, height:56, borderRadius:999, overflow:"hidden", border:`2px solid ${r.color}`, flexShrink:0 }}><img src={u.photo} alt={u.name} onError={handleImgError} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
                <Btn variant="ghost" size="sm" disabled={photoUploading} onClick={()=>fileInputRef.current?.click()} icon={photoUploading?<RefreshCw size={12} style={{animation:"spin 1s linear infinite"}}/>:<Upload size={12}/>}>{photoUploading?"업로드 중...":"사진 변경"}</Btn>
              </div>
              {photoError && <span style={{ fontSize:11, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{photoError}</span>}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>한줄 자기소개</span>
                  <span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:bio.length>45?"#ef4444":"#4a5a7a" }}>{bio.length}/50</span>
                </div>
                <textarea value={bio} onChange={e=>e.target.value.length<=50&&setBio(e.target.value)} rows={2} style={{ ...DS.input, width:"100%", padding:"10px 12px", resize:"none", fontFamily:"'Noto Sans KR'", fontSize:13, lineHeight:1.6, boxSizing:"border-box" }}/>
              </div>
              <Btn icon={saved?<CheckCircle2 size={13}/>:undefined} variant={saved?"ghost":"primary"} onClick={save} disabled={saving}>{saving?"저장 중...":saved?"저장됨":"저장하기"}</Btn>
            </div>
          </div>
          {/* Stats overview */}
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:12 }}>초기 능력치</h3>
            <BigHex stats={u.stats} size={220}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px", marginTop:8 }}>
              {STATS.map(s=>(
                <div key={s.key} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <InfoTooltip text={s.desc} placement="top">
                    <div style={{ display:"flex", alignItems:"center", gap:6, userSelect:"none" }}>
                      <s.Icon size={11} style={{color:s.color}}/>
                      <span style={{ fontSize:11, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{s.label}</span>
                    </div>
                  </InfoTooltip>
                  <span style={{ marginLeft:"auto", fontSize:12, fontFamily:"'Orbitron',monospace", color:s.color, fontWeight:700 }}>{u.stats[s.key as keyof typeof u.stats]}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Titles */}
          <div style={{ ...DS.card, padding:"20px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:12 }}>받은 칭호</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {u.titleVotes.map(tv=>(
                <div key={tv.title} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:"#dde5f0", fontFamily:"'Noto Sans KR'" }}>{tv.title}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:80, height:4, background:"rgba(255,255,255,0.08)", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ width:`${(tv.votes/10)*100}%`, height:"100%", background:r.color, borderRadius:2 }}/>
                    </div>
                    <span style={{ fontSize:11, fontFamily:"'Orbitron',monospace", color:r.color, fontWeight:700, width:20, textAlign:"right" }}>{tv.votes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
