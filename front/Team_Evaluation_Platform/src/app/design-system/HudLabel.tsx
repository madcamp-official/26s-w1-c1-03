// design.md §47: HUD/시스템 라벨은 IBM Plex Mono, 9-11px, letter-spacing 2-4px, 대문자 + 영어.
// 보조로 한국어 설명을 옅게 붙인다. stacked면 좁은 패널용으로 영문/한국어를 두 줄로 쌓는다.
export function HudLabel({ en, kr, stacked=false }: { en:string; kr?:string; stacked?:boolean }) {
  return (
    <div style={ stacked
      ? { display:"flex", flexDirection:"column", gap:3, marginBottom:12 }
      : { display:"flex", alignItems:"baseline", gap:8, marginBottom:12 } }>
      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"3px", color:"#7DD3FC", textTransform:"uppercase" }}>{en}</span>
      {kr && <span style={{ fontFamily:"'Noto Sans KR'", fontSize:11, color:"#64789c" }}>{kr}</span>}
    </div>
  );
}
