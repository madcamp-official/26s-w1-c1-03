// design.md §76: "반투명 남색 그라데이션 + backdrop-blur + 청록 코너 브래킷. 카드가 아니라
// 관측 계기판." 둥근 카드 대신 각진 패널 + 모서리 브래킷으로 SF 계기판 느낌을 낸다.
export function HoloPanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const bracket = (corner: "tl"|"tr"|"bl"|"br"): React.CSSProperties => ({
    position:"absolute", width:16, height:16,
    borderColor:"#5EEAD4", borderStyle:"solid", opacity:0.7,
    ...(corner==="tl" ? { top:-1, left:-1, borderWidth:"1.5px 0 0 1.5px" } : {}),
    ...(corner==="tr" ? { top:-1, right:-1, borderWidth:"1.5px 1.5px 0 0" } : {}),
    ...(corner==="bl" ? { bottom:-1, left:-1, borderWidth:"0 0 1.5px 1.5px" } : {}),
    ...(corner==="br" ? { bottom:-1, right:-1, borderWidth:"0 1.5px 1.5px 0" } : {}),
  });
  return (
    <div style={{
      position:"relative",
      background:"linear-gradient(160deg, rgba(8,17,38,0.92), rgba(11,23,54,0.88))",
      backdropFilter:"blur(12px)",
      border:"1px solid rgba(125,180,255,0.16)",
      borderRadius:3,
      padding:"22px 24px",
      ...style,
    }}>
      <div style={bracket("tl")}/>
      <div style={bracket("tr")}/>
      <div style={bracket("bl")}/>
      <div style={bracket("br")}/>
      {children}
    </div>
  );
}
