import { STATS } from "../constants/stats";
import type { Stats, User } from "../types";

function hexPoints(vals: number[], cx=50, cy=50, r=40): string {
  return vals.map((v,i)=>{
    const a=(i*60-90)*Math.PI/180, n=Math.min(v/100,1);
    return `${cx+r*n*Math.cos(a)},${cy+r*n*Math.sin(a)}`;
  }).join(" ");
}
function hexRing(scale: number, cx=50, cy=50, r=40): string {
  return [0,1,2,3,4,5].map(i=>{
    const a=(i*60-90)*Math.PI/180;
    return `${cx+r*scale*Math.cos(a)},${cy+r*scale*Math.sin(a)}`;
  }).join(" ");
}

// ─── SVG Hex Chart (mini, no recharts) ───────────────────────────────────────
export function MiniHex({ stats, size=72, color="#00c8ff" }: { stats:Stats; size?:number; color?:string }) {
  const vals = STATS.map(s=>stats[s.key as keyof Stats]);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {[0.33,0.66,1].map((sc,i)=>(
        <polygon key={i} points={hexRing(sc)} fill="none" stroke="rgba(0,200,255,0.14)" strokeWidth={0.6}/>
      ))}
      {[0,1,2,3,4,5].map(i=>{
        const a=(i*60-90)*Math.PI/180;
        return <line key={i} x1={50} y1={50} x2={50+40*Math.cos(a)} y2={50+40*Math.sin(a)} stroke="rgba(0,200,255,0.1)" strokeWidth={0.5}/>;
      })}
      <polygon points={hexPoints(vals)} fill={`${color}30`} stroke={color} strokeWidth={1.5}/>
      {vals.map((v,i)=>{
        const a=(i*60-90)*Math.PI/180, n=Math.min(v/100,1);
        return <circle key={i} cx={50+40*n*Math.cos(a)} cy={50+40*n*Math.sin(a)} r={2.5} fill={color}/>;
      })}
    </svg>
  );
}

// recharts의 PolarAngleAxis는 축마다 라벨을 그래프 바깥으로 밀어내는 정도가 미묘하게
// 달라(특히 아래쪽 꼭짓점) 마력 라벨이 그래프와 겹치는 문제를 percent/margin 조정만으로는
// 없앨 수 없었다. MiniHex와 같은 방식으로 좌표를 직접 계산해 그리면, 그래프 반경(r)과
// 라벨 반경(labelR) 사이의 간격을 모든 꼭짓점에 대해 항상 동일하게 보장할 수 있다.
export function BigHex({ stats, size=260, users, colors }: { stats?:Stats; size?:number; users?:User[]; colors?:string[] }) {
  const defaultColors = ["#00c8ff","#a855f7","#fbbf24"];
  // labelR-r 간격은 viewBox 단위라 렌더 크기(size)에 비례해 그대로 확대된다 — size가 커질수록
  // 그래프와 글씨 사이가 실제 화면에서 점점 더 멀어 보이는 원인이었다. 목표 픽셀 간격을 정해두고
  // size에 반비례하는 viewBox 간격을 역산하면, 카드 크기와 무관하게 실제 여백이 일정해진다.
  const TARGET_GAP_PX = 15;
  const cx=50, cy=50, r=32, labelR=r + (TARGET_GAP_PX*100)/size;
  const n = STATS.length;
  const angleOf = (i:number) => (i*360/n - 90) * Math.PI/180;

  const series = stats
    ? [{ color:"#00c8ff", vals: STATS.map(s=>stats[s.key as keyof Stats]) }]
    : (users??[]).map((u,i)=>({ color:(colors??defaultColors)[i], vals: STATS.map(s=>u.stats[s.key as keyof Stats]) }));

  return (
    <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0 }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow:"visible", flexShrink:0 }}>
        {[0.33,0.66,1].map((sc,i)=>(
          <polygon key={i} points={hexRing(sc,cx,cy,r)} fill="none" stroke="rgba(0,200,255,0.15)" strokeWidth={0.5}/>
        ))}
        {STATS.map((_,i)=>{
          const a=angleOf(i);
          return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="rgba(0,200,255,0.12)" strokeWidth={0.4}/>;
        })}
        {series.map((s,i)=>(
          <polygon key={i} points={hexPoints(s.vals,cx,cy,r)} fill={`${s.color}30`} stroke={s.color} strokeWidth={1.2}/>
        ))}
        {STATS.map((s,i)=>{
          const a = angleOf(i);
          const cosA = Math.cos(a), sinA = Math.sin(a);
          const lx = cx + labelR*cosA, ly = cy + labelR*sinA;
          const anchor = Math.abs(cosA)<0.35 ? "middle" : cosA>0 ? "start" : "end";
          const baseline = Math.abs(sinA)<0.35 ? "middle" : sinA>0 ? "hanging" : "baseline";
          return (
            <text key={s.key} x={lx} y={ly} textAnchor={anchor} dominantBaseline={baseline} fill="#8899bb" fontSize={5.6} fontFamily="'Noto Sans KR'">
              {s.label}
            </text>
          );
        })}
      </svg>
      {users && users.length>1 && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
          {users.map((u,i)=>(
            <div key={u.id} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:999, background:(colors??defaultColors)[i] }}/>
              <span style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>{u.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
