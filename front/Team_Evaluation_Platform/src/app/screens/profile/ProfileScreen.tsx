import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import {
  getMyProfile, getCard, updateProfile as apiUpdateProfile, uploadProfileImage as apiUploadProfileImage,
  ApiError, type UserProfileDto,
} from "../../api";
import type { User } from "../../types";
import { ZERO_STATS, dtoStatsToStats, rarityFromPower, totalPower, cardToUser, topTitles } from "../../lib/cardMapping";
import { validateProfileImage } from "../../lib/imageValidation";
import { FALLBACK_AVATAR } from "../../lib/avatar";
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

// ─── Profile Screen ───────────────────────────────────────────────────────────
export function ProfileScreen() {
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<UserProfileDto|null>(null);
  const [card, setCard] = useState<User|null>(null);
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);

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

  if (error) return centerMessage(error);
  if (!profile || !card) return centerMessage("프로필을 불러오는 중...", true);

  const u = card;
  const repTitle = topTitles(u.titleVotes)[0];
  const observations = profile.stats?.evaluationCount ?? 0;
  const code = `MDM-${String(profile.id).padStart(3,"0")}`;

  return (
    <div style={{ position:"relative", height:"100%", overflowY:"auto" }}>
      <SpaceBackground/>
      <div style={{ position:"relative", zIndex:1, padding: isMobile ? "22px 16px 34px" : "36px 40px 48px", minHeight:"100%", boxSizing:"border-box" }}>
        <div style={{ marginBottom:30 }}>
          <div style={{ fontFamily:FONT_HUD, fontSize:10, letterSpacing:"3px", color:SPACE.label, textTransform:"uppercase", marginBottom:6 }}>OBSERVATORY · SELF-LOG</div>
          <h1 style={{ fontFamily:FONT_DISPLAY, fontSize:26, fontWeight:500, color:SPACE.starWhite2, letterSpacing:"0.5px" }}>내 관측 기록</h1>
        </div>

        <div style={{ display:"flex", gap:26, flexWrap:"wrap", alignItems:"flex-start" }}>
          {/* Left: star identity panel — 모바일은 한 열로 쌓이도록 전체 폭을 쓴다 */}
          <HoloPanel style={{ width: isMobile ? "100%" : 296, boxSizing:"border-box", display:"flex", flexDirection:"column", alignItems:"center", gap:18 }}>
            <StarPortrait
              photo={u.photo}
              editable
              uploading={photoUploading}
              onSelectFile={handlePhotoSelected}
              size={148}
            />
            {photoError && <span style={{ fontSize:11, color:"#f87171", fontFamily:FONT_BODY, textAlign:"center" }}>{photoError}</span>}

            <div style={{ textAlign:"center", display:"flex", flexDirection:"column", gap:6 }}>
              <span style={{ fontFamily:FONT_HUD, fontSize:10, letterSpacing:"2px", color:SPACE.label }}>{code}</span>
              <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:500, color:SPACE.starWhite }}>{u.name}</h2>
              {repTitle && <RepresentativeTitle label={repTitle}/>}
            </div>

            <div style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"8px 0", borderTop:`1px solid ${SPACE.border}`, borderBottom:`1px solid ${SPACE.border}` }}>
              <span style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"2px", color:SPACE.label, textTransform:"uppercase" }}>OBSERVATIONS</span>
              <span style={{ fontFamily:FONT_HUD, fontSize:15, color:SPACE.accentTeal, fontWeight:500 }}>{observations}</span>
              <span style={{ fontFamily:FONT_BODY, fontSize:11, color:SPACE.label }}>회 관측됨</span>
            </div>

            <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                <span style={{ fontFamily:FONT_HUD, fontSize:9, letterSpacing:"2px", color:SPACE.label, textTransform:"uppercase" }}>TRANSMISSION LOG</span>
                <span style={{ fontFamily:FONT_HUD, fontSize:10, color:bio.length>45?"#f87171":SPACE.faint }}>{bio.length}/50</span>
              </div>
              <textarea
                value={bio}
                onChange={e=>e.target.value.length<=50&&setBio(e.target.value)}
                placeholder="나를 한 문장으로 소개한다면?"
                rows={3}
                style={{
                  width:"100%", boxSizing:"border-box", resize:"none", padding:"9px 11px",
                  background:"rgba(125,180,255,0.05)", border:`1px solid ${SPACE.border}`, borderRadius:3,
                  color:SPACE.text, fontFamily:FONT_BODY, fontSize:12.5, lineHeight:1.6, outline:"none",
                }}
              />
              {error && <span style={{ fontSize:11, color:"#f87171", fontFamily:FONT_BODY }}>{error}</span>}
              <button
                onClick={save}
                disabled={saving}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  padding:"9px 0", borderRadius:3, border:"none", cursor:saving?"not-allowed":"pointer",
                  fontFamily:FONT_HUD, fontSize:10.5, letterSpacing:"2px", fontWeight:500,
                  background: saved ? "rgba(94,234,212,0.12)" : SPACE.buttonGradient,
                  color: saved ? SPACE.accentTeal : SPACE.bgDeep,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saved ? <CheckCircle2 size={13}/> : null}
                {saving ? "SAVING..." : saved ? "SAVED" : "⌁ SAVE LOG"}
              </button>
            </div>
          </HoloPanel>

          {/* Right: spectral analysis + fragments */}
          <div style={{ flex:1, minWidth: isMobile ? 0 : 340, width: isMobile ? "100%" : undefined, display:"flex", flexDirection:"column", gap:22 }}>
            <HoloPanel>
              <HudLabel en="SPECTRAL ANALYSIS" kr="능력치 분석"/>
              <div style={{ display:"flex", justifyContent:"center" }}>
                <ConstellationChart stats={u.stats} size={isMobile ? 236 : 300}/>
              </div>
            </HoloPanel>

            <HoloPanel>
              <HudLabel en="CONSTELLATION FRAGMENTS" kr="획득 칭호" />
              {u.titleVotes.length===0 ? (
                <p style={{ fontSize:12, color:SPACE.label, fontFamily:FONT_BODY }}>아직 획득한 칭호가 없습니다.</p>
              ) : (
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {u.titleVotes.map(tv=>(
                    <TitleFragment key={tv.title} label={tv.title} votes={tv.votes}/>
                  ))}
                </div>
              )}
            </HoloPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
