import { STATS } from "../constants/stats";
import type { Stats } from "../types";

// design.md §80: 육각 레이더를 별자리로 재해석 — 흐린 그리드 3겹 + 꼭짓점은 빛나는 별,
// 데이터 선은 하나씩 순차적으로 그려지는 애니메이션(stroke-dashoffset), 내부 채움은 은은하게.
export function ConstellationChart({ stats, size=280, animate=true }: { stats:Stats; size?:number; animate?:boolean }) {
  const cx = size/2, cy = size/2, r = size/2 - 34;
  const n = STATS.length;
  const angleOf = (i:number) => -Math.PI/2 + i * (2*Math.PI/n);
  const pt = (i:number, frac:number) => [cx + Math.cos(angleOf(i))*r*frac, cy + Math.sin(angleOf(i))*r*frac] as const;

  const vals = STATS.map(s => stats[s.key as keyof Stats]/100);
  const dataPts = vals.map((v,i)=>pt(i,v));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow:"visible" }}>
      {/* grid rings */}
      {[0.33,0.66,1].map((f,gi)=>(
        <polygon key={"g"+gi} points={[0,1,2,3,4,5].map(i=>pt(i,f).join(",")).join(" ")} fill="none" stroke="rgba(125,180,255,.12)" strokeWidth={1}/>
      ))}
      {/* axes */}
      {[0,1,2,3,4,5].map(i=>{
        const [x,y] = pt(i,1);
        return <line key={"a"+i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(125,180,255,.08)" strokeWidth={1}/>;
      })}
      {/* data fill */}
      <polygon
        points={dataPts.map(p=>p.join(",")).join(" ")}
        fill="rgba(125,211,252,.09)"
        style={animate ? { animation:"fadeIn .8s 1.6s both" } : undefined}
      />
      {/* edges, drawn one by one */}
      {[0,1,2,3,4,5].map(i=>{
        const [x1,y1] = dataPts[i], [x2,y2] = dataPts[(i+1)%6];
        return (
          <line key={"e"+i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8fd0ff" strokeWidth={1.5}
            pathLength={1} strokeDasharray={1} strokeDashoffset={animate?1:0}
            style={{
              animation: animate ? `chartDraw .45s ease forwards ${0.35+i*0.22}s` : undefined,
              filter: `drop-shadow(0 0 3px rgba(125,211,252,${animate?0.8:0.6}))`,
            }}/>
        );
      })}
      {/* vertex stars */}
      {dataPts.map(([x,y],i)=>(
        <circle key={"v"+i} cx={x} cy={y} r={2.6} fill="#eef4ff"
          style={{ filter:"drop-shadow(0 0 4px rgba(190,220,255,1))", animation: animate ? `popIn .4s ease both ${0.3+i*0.22}s` : undefined }}/>
      ))}
      {/* labels: EN mono + KR value */}
      {STATS.map((s,i)=>{
        const [x,y] = pt(i,1.28);
        return (
          <g key={"l"+i}>
            <text x={x} y={y-3} textAnchor="middle" fill="#7DD3FC" style={{ font:"8.5px 'IBM Plex Mono',monospace", letterSpacing:"1.5px" }}>{s.en}</text>
            <text x={x} y={y+9} textAnchor="middle" fill="#64789c" style={{ font:"9px 'Noto Sans KR',sans-serif" }}>{s.label} {stats[s.key as keyof Stats]}</text>
          </g>
        );
      })}
    </svg>
  );
}
