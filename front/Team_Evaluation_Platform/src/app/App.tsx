import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { getAccessToken, getMyProfile, clearTokens, ApiError } from "./api";
import type { AuthPhase, MainScreen } from "./types";
import { GlobalStyle } from "./design-system/GlobalStyle";
import { Sidebar } from "./components/Sidebar";
import { ScreenErrorBoundary } from "./components/ScreenErrorBoundary";
import { LoginScreen } from "./screens/auth/LoginScreen";
import { ChangePasswordScreen } from "./screens/auth/ChangePasswordScreen";
import { ProfileSetupScreen } from "./screens/auth/ProfileSetupScreen";
import { PokedexScreen } from "./screens/pokedex/PokedexScreen";
import { TeamsScreen } from "./screens/teams/TeamsScreen";
import { EvaluateScreen } from "./screens/evaluate/EvaluateScreen";
import { AIScreen } from "./screens/chat/AIScreen";
import { CompareScreen } from "./screens/compare/CompareScreen";
import { ProfileScreen } from "./screens/profile/ProfileScreen";

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [authPhase, setAuthPhase] = useState<AuthPhase>("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState<MainScreen>("pokedex");
  const [checkingSession, setCheckingSession] = useState(true);

  // 저장된 토큰이 있으면 새로고침해도 로그인 상태/온보딩 단계를 복원한다.
  useEffect(() => {
    if (!getAccessToken()) { setCheckingSession(false); return; }
    getMyProfile()
      .then(profile => {
        if (!profile.passwordChanged) setAuthPhase("change-password");
        else if (!profile.onboarded) setAuthPhase("profile-setup");
        else setIsLoggedIn(true);
      })
      .catch(e => {
        // 비밀번호 미변경 사용자는 /users/me 자체가 403(PASSWORD_CHANGE_REQUIRED)으로 막혀있다.
        if (e instanceof ApiError && e.errorCode === "PASSWORD_CHANGE_REQUIRED") setAuthPhase("change-password");
      })
      .finally(() => setCheckingSession(false));
  }, []);

  function handleLoginSuccess(passwordChanged: boolean) {
    if (!passwordChanged) { setAuthPhase("change-password"); return; }
    setCheckingSession(true);
    getMyProfile()
      .then(profile => { if (profile.onboarded) setIsLoggedIn(true); else setAuthPhase("profile-setup"); })
      .catch(() => setAuthPhase("profile-setup"))
      .finally(() => setCheckingSession(false));
  }
  function handlePasswordChanged() { setAuthPhase("profile-setup"); }
  function handleProfileDone() { setIsLoggedIn(true); }
  function handleLogout() { clearTokens(); setIsLoggedIn(false); setAuthPhase("login"); setScreen("pokedex"); }

  if (checkingSession) {
    return (
      <>
        <GlobalStyle/>
        <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#070b12" }}>
          <RefreshCw size={24} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/>
        </div>
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <GlobalStyle/>
        {authPhase==="login" && <LoginScreen onLoginSuccess={handleLoginSuccess}/>}
        {authPhase==="change-password" && <ChangePasswordScreen onDone={handlePasswordChanged}/>}
        {authPhase==="profile-setup" && <ProfileSetupScreen onDone={handleProfileDone}/>}
      </>
    );
  }

  return (
    <>
      <GlobalStyle/>
      <div style={{ display:"flex", height:"100vh", background:"#070b12", overflow:"hidden" }}>
        <Sidebar screen={screen} setScreen={s=>{setScreen(s);}} onLogout={handleLogout}/>
        <main style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <ScreenErrorBoundary key={screen}>
            {screen==="pokedex"     && <PokedexScreen onEval={()=>setScreen("evaluate")}/>}
            {screen==="teams"       && <TeamsScreen/>}
            {screen==="evaluate"    && <EvaluateScreen onDone={()=>setScreen("pokedex")}/>}
            {screen==="ai-analysis" && <AIScreen/>}
            {screen==="compare"     && <CompareScreen/>}
            {screen==="profile"     && <ProfileScreen/>}
          </ScreenErrorBoundary>
        </main>
      </div>
    </>
  );
}
