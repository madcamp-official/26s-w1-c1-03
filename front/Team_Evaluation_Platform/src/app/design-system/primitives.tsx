import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Info } from "lucide-react";
import { DS } from "./tokens";

export function Btn({ children, variant="primary", onClick, disabled=false, size="md", full=false, icon, type="button" }: {
  children: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"|"purple";
  onClick?: (e:React.MouseEvent<HTMLButtonElement>)=>void; disabled?: boolean; size?: "sm"|"md"|"lg"; full?: boolean; icon?: React.ReactNode; type?: "button"|"submit";
}) {
  const styles: Record<string,React.CSSProperties> = {
    primary:   { background:"linear-gradient(135deg,#00c8ff,#0080b0)", color:"#060c18" },
    secondary: { background:"rgba(0,200,255,0.1)", color:"#00c8ff", border:"1px solid rgba(0,200,255,0.25)" },
    ghost:     { background:"rgba(255,255,255,0.04)", color:"#8899bb", border:"1px solid rgba(255,255,255,0.08)" },
    danger:    { background:"rgba(239,68,68,0.12)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)" },
    purple:    { background:"linear-gradient(135deg,#a855f7,#6d28d9)", color:"#fff" },
  };
  const pad = { sm:"6px 12px", md:"10px 20px", lg:"13px 28px" };
  const fs =  { sm:"12px",     md:"13px",      lg:"14px" };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: pad[size],
        fontSize: fs[size],
        borderRadius: 10,
        fontFamily:"'Noto Sans KR'",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        width: full ? "100%" : undefined,
        transition: "all 0.18s",
        display:"flex", alignItems:"center", gap:6, justifyContent:"center",
      }}
    >
      {icon}{children}
    </button>
  );
}

export function Field({ label, type="text", value, onChange, placeholder, error, right, autoComplete }: {
  label?: string; type?: string; value: string; onChange: (v:string)=>void;
  placeholder?: string; error?: string; right?: React.ReactNode; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{label}</span>}
      <div style={{ position:"relative" }}>
        <input
          type={isPass ? (show?"text":"password") : type}
          value={value}
          onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{ ...DS.input, width:"100%", padding:"11px 14px", paddingRight: isPass||right ? 42 : 14, boxSizing:"border-box", fontSize:14 }}
        />
        {isPass && (
          <button type="button" onClick={()=>setShow(s=>!s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#8899bb", cursor:"pointer" }}>
            {show ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        )}
        {right && <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)" }}>{right}</div>}
      </div>
      {error && <span style={{ fontSize:11, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>{error}</span>}
    </div>
  );
}

// 능력치 이름/수치처럼 텍스트가 드래그·복사되는 대신, 마우스를 올리면 근처 고정
// 위치에 말풍선으로 설명을 띄우는 공용 처리. 능력치가 표시되는 다른 화면에서도 재사용한다.
// 말풍선을 트리거 바로 아래(position:absolute)에 두면, 스크롤 컨테이너나 표(overflow:auto)
// 안에서 열릴 때 그 컨테이너의 스크롤 영역 크기 계산에 말풍선 박스가 끼어들어 표/레이아웃이
// 미세하게 흔들리는 문제가 있었다. document.body에 포털로 그려 position:fixed로 좌표를
// 직접 계산하면 어떤 조상의 레이아웃/스크롤 크기에도 영향을 주지 않는다.
export interface TooltipRect { top:number; bottom:number; left:number; right:number; }

// 툴팁 말풍선의 표시 부분만 분리한 프리미티브 — InfoTooltip(HTML 트리거)뿐 아니라
// div로 감쌀 수 없는 SVG 라벨(ConstellationChart)에서도 같은 말풍선을 쓰기 위함.
// placement를 생략하면 트리거의 화면 위치에 따라 위/아래를 자동으로 고른다(모바일에서
// 화면 하단 요소의 툴팁이 뷰포트 밖으로 나가는 것 방지).
export function TooltipBubble({ rect, text, placement }: { rect: TooltipRect; text: string; placement?: "top"|"bottom" }) {
  const place = placement ?? (rect.top > window.innerHeight/2 ? "top" : "bottom");
  const alignRight = rect.left + (rect.right-rect.left)/2 > window.innerWidth/2;
  return createPortal(
    <div style={{
      position:"fixed", zIndex:1000,
      ...(place==="top" ? { bottom: window.innerHeight-rect.top+9 } : { top: rect.bottom+9 }),
      ...(alignRight ? { right: Math.max(12, window.innerWidth-rect.right) } : { left: Math.max(12, rect.left) }),
      width:"min(260px, calc(100vw - 24px))", padding:"11px 14px", borderRadius:10,
      background:"#0e1526", border:"1px solid rgba(0,200,255,0.25)",
      boxShadow:"0 10px 30px rgba(0,0,0,0.5)",
      fontSize:11, lineHeight:1.65, color:"#c7d2e6", fontFamily:"'Noto Sans KR'",
      whiteSpace:"pre-line", pointerEvents:"none",
    }}>
      <div style={{
        position:"absolute", ...(place==="top" ? { bottom:-6 } : { top:-6 }), ...(alignRight ? { right:14 } : { left:14 }),
        width:11, height:11, background:"#0e1526",
        ...(place==="top"
          ? { borderRight:"1px solid rgba(0,200,255,0.25)", borderBottom:"1px solid rgba(0,200,255,0.25)" }
          : { borderLeft:"1px solid rgba(0,200,255,0.25)", borderTop:"1px solid rgba(0,200,255,0.25)" }),
        transform:"rotate(45deg)",
      }}/>
      {text}
    </div>,
    document.body
  );
}

export function InfoTooltip({ children, text, placement }: { children: React.ReactNode; text: string; placement?: "top"|"bottom" }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<TooltipRect|null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (r) setRect({ top:r.top, bottom:r.bottom, left:r.left, right:r.right });
    setOpen(true);
  }

  // 호버가 없는 터치 환경 지원: 탭으로 열고, 트리거 바깥을 누르면 닫는다.
  useEffect(()=>{
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return ()=>document.removeEventListener("pointerdown", onDown);
  },[open]);

  return (
    <div
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={()=>setOpen(false)}
      onClick={show}
      style={{ position:"relative", display:"inline-flex", alignItems:"center", cursor:"help" }}
    >
      {children}
      {open && rect && <TooltipBubble rect={rect} text={text} placement={placement}/>}
    </div>
  );
}

export function StatSlider({ label, desc, value, onChange, color, Icon }: { label:string; desc?:string; value:number; onChange:(v:number)=>void; color:string; Icon:any }) {
  const labelNode = (
    <div style={{ display:"flex", alignItems:"center", gap:5, userSelect:"none" }}>
      <Icon size={13} style={{ color }} />
      <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{label}</span>
      {desc && <Info size={11} style={{ color:"#4a5a7a" }}/>}
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"space-between" }}>
        {desc ? <InfoTooltip text={desc}>{labelNode}</InfoTooltip> : labelNode}
        <span style={{ fontSize:13, fontFamily:"'Orbitron',monospace", color, fontWeight:700, userSelect:"none" }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e=>onChange(+e.target.value)}
        className="stat-range"
        style={{
          width:"100%", height:4, color,
          background:`linear-gradient(to right, ${color} 0%, ${color} ${(value-1)/9*100}%, rgba(255,255,255,0.12) ${(value-1)/9*100}%, rgba(255,255,255,0.12) 100%)`,
        }} />
    </div>
  );
}

export function Pill({ label, color="#00c8ff", small=false }: { label:string; color?:string; small?:boolean }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      padding: small ? "1px 6px" : "4px 10px",
      borderRadius:999,
      fontSize: small ? 10 : 11,
      background:`${color}1a`,
      color,
      border:`1px solid ${color}44`,
      fontFamily:"'Noto Sans KR'",
      whiteSpace:"nowrap",
    }}>{label}</span>
  );
}

export function Progress({ value, max=100, color="#00c8ff" }: { value:number; max?:number; color?:string }) {
  const pct = Math.min((value/max)*100, 100);
  return (
    <div style={{ width:"100%", height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:3, transition:"width 0.4s ease" }} />
    </div>
  );
}
