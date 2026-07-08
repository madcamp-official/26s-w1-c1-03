import { useState, useRef } from "react";
import { SPACE, FONT } from "../../design-system/space";

export function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const pad = (n:number)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function parseDeadlineParts(v: string): { year:string; month:string; day:string; hour:string; minute:string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  return m ? { year:m[1], month:m[2], day:m[3], hour:m[4], minute:m[5] } : { year:"", month:"", day:"", hour:"", minute:"" };
}

// 네이티브 <input type="datetime-local">는 오전/오후 표기를 브라우저·OS 로케일에 맡길 뿐
// 24시간제로 강제할 방법이 없고, 연도 4자리 입력 후 자동으로 월 칸으로 넘어가는 동작도
// 브라우저 내부 구현이라 통제가 안 된다. 그래서 연/월/일/시/분을 각각 우리가 직접 관리하는
// 숫자 칸으로 구현해 두 문제 모두를 프론트에서 직접 통제한다.
export function DeadlineField({ value, onChange, error }: { value:string; onChange:(v:string)=>void; error?:string }) {
  const initial = parseDeadlineParts(value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  function emit(next: { year?:string; month?:string; day?:string; hour?:string; minute?:string }) {
    const y = next.year ?? year, mo = next.month ?? month, d = next.day ?? day, h = next.hour ?? hour, mi = next.minute ?? minute;
    if (y.length===4 && mo.length===2 && d.length===2 && h.length===2 && mi.length===2) onChange(`${y}-${mo}-${d}T${h}:${mi}`);
    else onChange("");
  }

  const digitsOnly = (v:string, maxLen:number) => v.replace(/[^0-9]/g,"").slice(0,maxLen);
  // 두 자리를 다 채우는 순간 유효 범위로 맞추고 다음 칸으로 넘어간다(연도는 4자리 채우면 바로 월로).
  const clamp2 = (digits:string, lo:number, hi:number) => digits.length<2 ? digits : String(Math.min(Math.max(parseInt(digits,10)||0, lo), hi)).padStart(2,"0");

  function handleYear(v:string) {
    const digits = digitsOnly(v,4);
    setYear(digits); emit({year:digits});
    if (digits.length===4) monthRef.current?.focus();
  }
  function handleMonth(v:string) {
    const digits = clamp2(digitsOnly(v,2),1,12);
    setMonth(digits); emit({month:digits});
    if (digits.length===2) dayRef.current?.focus();
  }
  function handleDay(v:string) {
    const digits = clamp2(digitsOnly(v,2),1,31);
    setDay(digits); emit({day:digits});
    if (digits.length===2) hourRef.current?.focus();
  }
  function handleHour(v:string) {
    const digits = clamp2(digitsOnly(v,2),0,23);
    setHour(digits); emit({hour:digits});
    if (digits.length===2) minuteRef.current?.focus();
  }
  function handleMinute(v:string) {
    const digits = clamp2(digitsOnly(v,2),0,59);
    setMinute(digits); emit({minute:digits});
  }
  function backspaceTo(ref: React.RefObject<HTMLInputElement>, current:string) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key==="Backspace" && current==="") ref.current?.focus(); };
  }

  // 관측소 계기판 스타일(design.md §3) — 남색 반투명 배경 + 은은한 보더 + mono 숫자.
  const segStyle: React.CSSProperties = {
    padding:"11px 0", textAlign:"center", fontSize:13, fontFamily:FONT.hud, boxSizing:"border-box",
    background:"rgba(125,180,255,0.05)", border:`1px solid ${SPACE.border}`, borderRadius:3,
    color:SPACE.starWhite, outline:"none",
  };
  const sep = (ch:string) => <span style={{ color:SPACE.faint, fontSize:14, fontFamily:FONT.hud }}>{ch}</span>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
        <span style={{ fontFamily:FONT.hud, fontSize:10, letterSpacing:"3px", color:SPACE.accentSky, textTransform:"uppercase" }}>DEADLINE</span>
        <span style={{ fontFamily:FONT.body, fontSize:11, color:SPACE.label }}>프로젝트 마감기한 (24시간 형식)</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <input ref={yearRef} value={year} onChange={e=>handleYear(e.target.value)} placeholder="YYYY" inputMode="numeric" style={{ ...segStyle, width:60 }}/>
        {sep("-")}
        <input ref={monthRef} value={month} onChange={e=>handleMonth(e.target.value)} onKeyDown={backspaceTo(yearRef,month)} placeholder="MM" inputMode="numeric" style={{ ...segStyle, width:38 }}/>
        {sep("-")}
        <input ref={dayRef} value={day} onChange={e=>handleDay(e.target.value)} onKeyDown={backspaceTo(monthRef,day)} placeholder="DD" inputMode="numeric" style={{ ...segStyle, width:38 }}/>
        <span style={{ width:6 }}/>
        <input ref={hourRef} value={hour} onChange={e=>handleHour(e.target.value)} onKeyDown={backspaceTo(dayRef,hour)} placeholder="HH" inputMode="numeric" style={{ ...segStyle, width:38 }}/>
        {sep(":")}
        <input ref={minuteRef} value={minute} onChange={e=>handleMinute(e.target.value)} onKeyDown={backspaceTo(hourRef,minute)} placeholder="mm" inputMode="numeric" style={{ ...segStyle, width:38 }}/>
      </div>
      {error && <span style={{ fontSize:11, color:"#f87171", fontFamily:FONT.body }}>{error}</span>}
    </div>
  );
}
