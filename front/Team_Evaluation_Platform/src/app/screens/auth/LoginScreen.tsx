import { useState } from "react";
import { Notebook, AlertTriangle, RefreshCw } from "lucide-react";
import { login as apiLogin, ApiError } from "../../api";
import { DS } from "../../design-system/tokens";
import { Btn, Field } from "../../design-system/primitives";

// ─── Auth Screens ─────────────────────────────────────────────────────────────
export function LoginScreen({ onLoginSuccess }: { onLoginSuccess:(passwordChanged:boolean)=>void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
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
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#070b12", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 20% 20%, rgba(0,200,255,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.06) 0%, transparent 50%)" }}/>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(0,200,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,255,0.04) 1px,transparent 1px)", backgroundSize:"40px 40px" }}/>
      <div style={{ ...DS.card, width:380, padding:"40px 36px", position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,rgba(0,200,255,0.2),rgba(168,85,247,0.2))", border:"1px solid rgba(0,200,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
            <Notebook size={26} style={{color:"#00c8ff"}}/>
          </div>
          <h1 style={{ fontSize:22, fontFamily:"'Noto Sans KR'", color:"#00c8ff", fontWeight:700 }}>매드몬 도감</h1>
        </div>
        <form onSubmit={e=>{ e.preventDefault(); handle(); }} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="아이디" value={id} onChange={setId} placeholder="아이디 입력" autoComplete="username"/>
          <Field label="비밀번호" type="password" value={pw} onChange={setPw} placeholder="비밀번호 입력" autoComplete="current-password"/>
          {err && <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)" }}>
            <AlertTriangle size={13} style={{color:"#ef4444",flexShrink:0}}/>
            <span style={{ fontSize:12, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{err}</span>
          </div>}
          <Btn full type="submit" disabled={loading||locked} icon={loading?<RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/>:undefined}>
            {loading?"로그인 중...":"로그인"}
          </Btn>
          <p style={{ fontSize:11, color:"#4a5a7a", textAlign:"center", fontFamily:"'Noto Sans KR'" }}>
            초기 아이디/비밀번호: 인스타 아이디
          </p>
        </form>
      </div>
    </div>
  );
}
