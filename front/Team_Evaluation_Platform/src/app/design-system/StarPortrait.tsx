import { useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";
import { AVATAR_IMG, handleImgError } from "../lib/avatar";

// design.md §76: "원형 프로필(주위를 도는 점선 궤도 + 위성 점 2개)". 카드가 아니라 별 하나로
// 사람을 표현하는 컴포넌트 — 관측소 세계관의 핵심 시각 은유.
export function StarPortrait({
  photo, glowColor="#7DD3FC", glowC="125,211,252", size=168,
  editable=false, uploading=false, onSelectFile,
}: {
  photo: string; glowColor?: string; glowC?: string; size?: number;
  editable?: boolean; uploading?: boolean; onSelectFile?: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const orbitSize = size * 1.34;

  return (
    <div style={{ position:"relative", width:orbitSize, height:orbitSize, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      {/* 바깥 점선 궤도 — 은은하게 회전 */}
      <div style={{
        position:"absolute", inset:0, borderRadius:"50%",
        border:"1px dashed rgba(125,180,255,.28)",
        animation:"orbitSpin 22s linear infinite",
      }}/>
      {/* 위성 점 2개 — 서로 다른 주기로 공전(동기화 금지).
          점의 중심이 컨테이너 중심에서 궤도 반지름 이내에 있어야 회전 중에도 컨테이너를
          벗어나지 않는다 — 모서리(bottom/right) 배치는 반지름이 √2배로 커져 밖으로 나간다. */}
      <div style={{ position:"absolute", inset:0, animation:"orbitSpin 9s linear infinite" }}>
        <div style={{ position:"absolute", top:0, left:"50%", width:6, height:6, marginLeft:-3, borderRadius:"50%", background:"#5EEAD4", boxShadow:"0 0 6px rgba(94,234,212,.9)" }}/>
      </div>
      <div style={{ position:"absolute", inset:0, animation:"orbitSpin 15s linear infinite reverse" }}>
        <div style={{ position:"absolute", top:"50%", right:10, width:4, height:4, marginTop:-2, borderRadius:"50%", background:"#A78BFA", boxShadow:"0 0 5px rgba(167,139,250,.9)" }}/>
      </div>
      {/* 별 코어(프로필 사진) */}
      <div style={{
        position:"relative", width:size, height:size, borderRadius:"50%", overflow:"hidden",
        boxShadow:`0 0 ${size*0.18}px ${size*0.05}px rgba(${glowC},.55), 0 0 ${size*0.5}px ${size*0.18}px rgba(${glowC},.22)`,
        border:`1px solid rgba(${glowC},.5)`,
        cursor: editable ? (uploading?"wait":"pointer") : "default",
      }}
        onClick={()=>editable && !uploading && fileInputRef.current?.click()}
        onMouseEnter={()=>editable && setHover(true)}
        onMouseLeave={()=>setHover(false)}
      >
        <img src={photo} alt="" onError={handleImgError} style={AVATAR_IMG}/>
        {editable && (
          <div style={{
            position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(2,6,23,0.55)", opacity:hover||uploading?1:0, transition:"opacity .2s",
          }}>
            {uploading
              ? <RefreshCw size={20} style={{ color:glowColor, animation:"spin 1s linear infinite" }}/>
              : <Camera size={20} style={{ color:glowColor }}/>}
          </div>
        )}
      </div>
      {editable && (
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display:"none" }}
          onChange={e=>{ const f=e.target.files?.[0]; if(f && onSelectFile) onSelectFile(f); e.target.value=""; }}/>
      )}
    </div>
  );
}
