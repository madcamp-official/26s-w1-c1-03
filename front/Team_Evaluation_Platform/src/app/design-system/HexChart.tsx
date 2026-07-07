import { STATS } from "../constants/stats";
import type { Stats } from "../types";

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
