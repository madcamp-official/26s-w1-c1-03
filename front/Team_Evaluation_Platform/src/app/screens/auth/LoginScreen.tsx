import { useEffect, useState } from "react";
import { login as apiLogin, ApiError } from "../../api";
import {
  OBS, ObservatoryStyle, SpaceBackground, ObsPanel, ObsField, ObsButton, ObsError, MonoLabel,
} from "../../design-system/observatory";

// 인트로는 "첫 진입" 연출이므로 앱을 새로 열었을 때 한 번만 보여준다.
// (로그아웃 후 다시 로그인 화면으로 돌아와도 반복하지 않는다.)
let introPlayed = false;

function Intro({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 3100);
    const t2 = setTimeout(onDone, 4100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  function skip() {
    setFading(true);
    setTimeout(onDone, 700);
  }
  return (
    <div onClick={skip} style={{
      position: "absolute", inset: 0, background: "#020617", zIndex: 10, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22,
      transition: "opacity 1s", opacity: fading ? 0 : 1,
    }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: OBS.starWhite, boxShadow: "0 0 30px 8px rgba(160,200,255,.7)", animation: "obsStarBreathe 2.4s ease-in-out infinite" }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: OBS.display, fontSize: 20, fontWeight: 600, letterSpacing: 10, color: OBS.starWhite, animation: "obsFadeUp 1.4s both" }}>MADNOVA</div>
        <div style={{ marginTop: 8, animation: "obsFadeUp 1.4s .3s both" }}>
          <MonoLabel size={10} spacing={4}>DEEP-SKY OBSERVATORY</MonoLabel>
        </div>
      </div>
      <div style={{ width: 220, height: 1, background: "rgba(125,180,255,.12)", overflow: "hidden", animation: "obsFadeIn 1s .5s both" }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg,transparent,#7DD3FC,#5EEAD4)", animation: "obsIntroBar 2.4s .5s cubic-bezier(.4,0,.2,1) both" }} />
      </div>
      <div style={{ animation: "obsBlinkDim 1.6s ease-in-out infinite" }}>
        <MonoLabel size={9.5} spacing={3} color={OBS.faint}>INITIALIZING OBSERVATION SYSTEMS…</MonoLabel>
      </div>
    </div>
  );
}

// ─── Auth Screens ─────────────────────────────────────────────────────────────
export function LoginScreen({ onLoginSuccess }: { onLoginSuccess:(passwordChanged:boolean)=>void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [intro, setIntro] = useState(!introPlayed);
  async function handle() {
    if (locked) return;
    if (!id||!pw){setErr("아이디와 비밀번호를 입력해주세요."); return;}
    setErr(""); setLoading(true);
    try {
      const res = await apiLogin(id, pw);
      onLoginSuccess(res.passwordChanged);
    } catch (e) {
      if (e instanceof ApiError && e.errorCode === "ACCOUNT_LOCKED") {
        setLocked(true);
        setErr("시도 횟수가 너무 많아 로그인이 차단되었습니다. 관리자에게 문의하세요.");
      } else {
        setErr(e instanceof ApiError ? e.message : "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", background: OBS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ObservatoryStyle/>
      <SpaceBackground/>

      {/* HUD 모서리 텍스트 */}
      <div style={{ position: "absolute", top: 26, left: 32, display: "flex", alignItems: "baseline", gap: 14, animation: "obsFadeIn 1.2s both", pointerEvents: "none" }}>
        <span style={{ fontFamily: OBS.display, fontWeight: 600, fontSize: 14, letterSpacing: 5, color: OBS.starWhite }}>MADNOVA</span>
        <MonoLabel size={10} spacing={3}>DEEP-SKY OBSERVATORY</MonoLabel>
      </div>
      <div style={{ position: "absolute", bottom: 26, left: 32, animation: "obsFadeIn 1.2s both", pointerEvents: "none" }}>
        <MonoLabel size={10} spacing={2.5}><span style={{ color: OBS.teal }}>◉</span> OBSERVATION LINK STANDBY</MonoLabel>
      </div>
      <div style={{ position: "absolute", bottom: 26, right: 32, animation: "obsFadeIn 1.2s both", pointerEvents: "none" }}>
        <MonoLabel size={10} spacing={2}>RA 05h 34m · DEC +22° 00′</MonoLabel>
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 30, animation: "obsFadeUp 1.1s both" }}>
        {/* 로고: 맥동하는 별 + 워드마크 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 58, height: 58, transform: "translate(-50%,-50%)", border: "1px dashed rgba(125,180,255,.35)", borderRadius: "50%", animation: "obsSpinC 16s linear infinite" }}>
              <div style={{ position: "absolute", top: -2.5, left: "50%", width: 5, height: 5, borderRadius: "50%", background: OBS.teal, boxShadow: "0 0 8px 2px rgba(94,234,212,.7)" }} />
            </div>
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: OBS.starWhite, boxShadow: "0 0 26px 7px rgba(160,200,255,.65)", animation: "obsStarBreathe 3.2s ease-in-out infinite" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: OBS.display, fontSize: 22, fontWeight: 600, letterSpacing: 9, color: OBS.starWhite }}>MADNOVA</div>
            <div style={{ marginTop: 6 }}><MonoLabel size={9.5} spacing={4}>DEEP-SKY OBSERVATORY</MonoLabel></div>
          </div>
        </div>

        {/* 관측자 인증 패널 */}
        <ObsPanel width={392} style={{ padding: "24px 28px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <MonoLabel size={9.5} spacing={3.5} color={OBS.teal}>OBSERVER AUTHENTICATION</MonoLabel>
            <MonoLabel size={9.5} spacing={2}>AUTH-01</MonoLabel>
          </div>
          <form onSubmit={e => { e.preventDefault(); handle(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ObsField label="OBSERVER ID" labelKr="아이디" value={id} onChange={setId} placeholder="아이디 입력" autoComplete="username"/>
            <ObsField label="ACCESS CODE" labelKr="비밀번호" type="password" value={pw} onChange={setPw} placeholder="비밀번호 입력" autoComplete="current-password"/>
            {err && <ObsError>{err}</ObsError>}
            <div style={{ marginTop: 4 }}>
              <ObsButton type="submit" disabled={loading||locked} blink={loading}>
                {locked ? "LINK BLOCKED" : loading ? "⌁ ESTABLISHING LINK…" : "◉ ACCESS OBSERVATORY · 접속"}
              </ObsButton>
            </div>
            <p style={{ fontSize: 11, fontWeight: 300, color: OBS.dim, textAlign: "center", fontFamily: OBS.kr, margin: 0 }}>
              초기 아이디/비밀번호: 인스타 아이디
            </p>
          </form>
        </ObsPanel>
      </div>

      {intro && <Intro onDone={() => { introPlayed = true; setIntro(false); }}/>}
    </div>
  );
}
