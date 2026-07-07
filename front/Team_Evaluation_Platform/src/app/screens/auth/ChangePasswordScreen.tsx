import { useState } from "react";
import { Notebook, Lock } from "lucide-react";
import { changePassword as apiChangePassword, ApiError } from "../../api";
import { DS } from "../../design-system/tokens";
import { Btn, Field } from "../../design-system/primitives";

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
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#070b12", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 50% 30%, rgba(168,85,247,0.08) 0%, transparent 60%)" }}/>
      <div style={{ ...DS.card, width:400, padding:"38px 36px", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:24 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(0,200,255,0.2),rgba(168,85,247,0.2))", border:"1px solid rgba(0,200,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Notebook size={15} style={{color:"#00c8ff"}}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontFamily:"'Noto Sans KR'", color:"#00c8ff", fontWeight:700 }}>매드몬 도감</div>
            <div style={{ fontSize:9, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>팀원 평가 플랫폼</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Lock size={16} style={{color:"#a855f7"}}/>
          </div>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0" }}>비밀번호 변경</h2>
            <p style={{ fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>최초 로그인 시 비밀번호를 변경해주세요</p>
          </div>
        </div>
        <form onSubmit={e=>{ e.preventDefault(); handle(); }} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="현재 비밀번호" type="password" value={cur} onChange={setCur} placeholder="기존 비밀번호" autoComplete="current-password"/>
          <Field label="새 비밀번호" type="password" value={np} onChange={setNp} placeholder="8자 이상" autoComplete="new-password"/>
          <Field label="새 비밀번호 확인" type="password" value={nc} onChange={setNc} placeholder="다시 입력" autoComplete="new-password"/>
          {err && <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>}
          <Btn full type="submit" variant="purple" disabled={loading}>{loading?"변경 중...":"변경하기"}</Btn>
        </form>
      </div>
    </div>
  );
}
