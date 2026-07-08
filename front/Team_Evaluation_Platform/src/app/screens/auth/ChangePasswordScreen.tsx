import { useState } from "react";
import { changePassword as apiChangePassword, ApiError } from "../../api";
import {
  OBS, ObservatoryStyle, SpaceBackground, ObsPanel, ObsField, ObsButton, ObsError, MonoLabel,
} from "../../design-system/observatory";

export function ChangePasswordScreen({ onDone }: { onDone:()=>void }) {
  const [cur, setCur] = useState("");
  const [np, setNp] = useState("");
  const [nc, setNc] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  async function handle() {
    if (!cur){setErr("현재 비밀번호를 입력해주세요."); return;}
    if (np.length<8||np.length>100){setErr("새 비밀번호는 8자 이상 100자 이하여야 합니다."); return;}
    if (np!==nc){setErr("새 비밀번호가 일치하지 않습니다."); return;}
    setErr(""); setLoading(true);
    try {
      await apiChangePassword(cur, np);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", background: OBS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ObservatoryStyle/>
      <SpaceBackground/>

      <div style={{ position: "absolute", top: 26, left: 32, display: "flex", alignItems: "baseline", gap: 14, animation: "obsFadeIn 1.2s both", pointerEvents: "none" }}>
        <span style={{ fontFamily: OBS.display, fontWeight: 600, fontSize: 14, letterSpacing: 5, color: OBS.starWhite }}>MADNOVA</span>
        <MonoLabel size={10} spacing={3}>DEEP-SKY OBSERVATORY</MonoLabel>
      </div>
      <div style={{ position: "absolute", bottom: 26, left: 32, animation: "obsFadeIn 1.2s both", pointerEvents: "none" }}>
        <MonoLabel size={10} spacing={2.5}><span style={{ color: OBS.violet }}>◉</span> SECURITY PROTOCOL ACTIVE</MonoLabel>
      </div>

      <div style={{ position: "relative", zIndex: 1, animation: "obsFadeUp 1s both" }}>
        <ObsPanel width={400} style={{ padding: "24px 28px 26px" }} bracketColor={OBS.violet}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <MonoLabel size={9.5} spacing={3.5} color={OBS.violet}>SECURITY PROTOCOL</MonoLabel>
            <MonoLabel size={9.5} spacing={2}>AUTH-02</MonoLabel>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: OBS.display, fontSize: 18, fontWeight: 600, letterSpacing: 1, color: OBS.title, marginBottom: 5 }}>
              비밀번호 변경
            </div>
            <p style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.7, color: OBS.sub, fontFamily: OBS.kr, margin: 0 }}>
              최초 접속이 확인되었습니다. 관측소 보안을 위해 접속 코드를 재설정해주세요.
            </p>
          </div>
          <form onSubmit={e => { e.preventDefault(); handle(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ObsField label="CURRENT CODE" labelKr="현재 비밀번호" type="password" value={cur} onChange={setCur} placeholder="기존 비밀번호" autoComplete="current-password"/>
            <ObsField label="NEW CODE" labelKr="새 비밀번호" type="password" value={np} onChange={setNp} placeholder="8자 이상" autoComplete="new-password"/>
            <ObsField label="CONFIRM CODE" labelKr="새 비밀번호 확인" type="password" value={nc} onChange={setNc} placeholder="다시 입력" autoComplete="new-password"/>
            {err && <ObsError>{err}</ObsError>}
            <div style={{ marginTop: 4 }}>
              <ObsButton type="submit" disabled={loading} blink={loading}>
                {loading ? "⌁ UPDATING CODE…" : "◉ UPDATE ACCESS CODE · 변경"}
              </ObsButton>
            </div>
          </form>
        </ObsPanel>
      </div>
    </div>
  );
}
