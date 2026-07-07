// design.md §89: 배지 금지. 획득 칭호는 "✦—" 별자리 조각 모양의 얇은 보더 칩.
export function TitleFragment({ label, votes }: { label:string; votes?:number }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"5px 11px 5px 9px", borderRadius:3,
      border:"1px solid rgba(125,180,255,.28)",
      background:"rgba(125,180,255,.05)",
      fontSize:12, fontFamily:"'Noto Sans KR'", color:"#c6d6ef",
      whiteSpace:"nowrap",
    }}>
      <span style={{ color:"#7DD3FC" }}>✦—</span>
      {label}
      {votes !== undefined && <span style={{ color:"#5EEAD4", fontFamily:"'IBM Plex Mono',monospace", fontSize:11 }}>{votes}</span>}
    </span>
  );
}

// design.md §77: 이름 옆 ✦ 대표 칭호 — 글로우 텍스트로 가장 크게.
export function RepresentativeTitle({ label }: { label:string }) {
  return (
    <span style={{
      fontSize:15, fontFamily:"'Noto Sans KR'", fontWeight:500, color:"#eef4ff",
      textShadow:"0 0 12px rgba(125,211,252,.6)",
    }}>
      <span style={{ color:"#7DD3FC", marginRight:6 }}>✦</span>{label}
    </span>
  );
}
