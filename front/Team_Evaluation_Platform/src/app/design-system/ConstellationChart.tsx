import { useEffect, useState } from "react";
import { STATS } from "../constants/stats";
import type { Stats } from "../types";
import { TooltipBubble, type TooltipRect } from "./primitives";

interface Series { name: string; color: string; stats: Stats; }

// design.md §80: 육각 레이더를 별자리로 재해석 — 흐린 그리드 3겹 + 꼭짓점은 빛나는 별,
// 데이터 선은 하나씩 순차적으로 그려지는 애니메이션(stroke-dashoffset), 내부 채움은 은은하게.
//
// series가 주어지면(별 비교 화면) 여러 사람의 다각형을 겹쳐 그리는 비교 모드로 동작한다 —
// 이땐 한 사람 값이 아니라 여러 값을 동시에 보여줘야 하므로 순차 드로잉 애니메이션 없이
// 정적으로 그리고, 값 라벨 대신 하단에 이름 범례를 붙인다.
export function ConstellationChart({ stats, series, size=280, animate=true }: { stats?:Stats; series?:Series[]; size?:number; animate?:boolean }) {
  const cx = size/2, cy = size/2, r = size/2 - 34;
  const n = STATS.length;
  const angleOf = (i:number) => -Math.PI/2 + i * (2*Math.PI/n);
  const pt = (i:number, frac:number) => [cx + Math.cos(angleOf(i))*r*frac, cy + Math.sin(angleOf(i))*r*frac] as const;

  const compareMode = !!series;

  // 스탯 라벨 호버/탭 시 설명 툴팁 — 이 차트가 스탯이 보이는 유일한 자리인 화면
  // (은하 관측 패널/내 프로필/별 비교)에서도 스탯 의미를 확인할 수 있게 한다.
  const [tip, setTip] = useState<{ i:number; rect:TooltipRect }|null>(null);
  useEffect(()=>{
    if (!tip) return;
    function onDown() { setTip(null); }
    document.addEventListener("pointerdown", onDown);
    return ()=>document.removeEventListener("pointerdown", onDown);
  },[tip]);
  function showTip(i: number, e: React.MouseEvent<SVGGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ i, rect:{ top:r.top, bottom:r.bottom, left:r.left, right:r.right } });
  }

  const singleStats = stats ?? STATS.reduce((acc,s)=>({ ...acc, [s.key]:0 }), {} as Stats);
  const vals = STATS.map(s => singleStats[s.key as keyof Stats]/100);
  const dataPts = vals.map((v,i)=>pt(i,v));

  const seriesPts = (series ?? []).map(s => ({
    ...s,
    pts: STATS.map((st,i)=>pt(i, s.stats[st.key as keyof Stats]/100)),
  }));

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
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

        {compareMode ? (
          <>
            {seriesPts.map(s=>(
              <polygon key={"fill-"+s.name} points={s.pts.map(p=>p.join(",")).join(" ")} fill={`${s.color}22`} stroke={s.color} strokeWidth={1.4}/>
            ))}
            {seriesPts.map(s=>s.pts.map(([x,y],i)=>(
              <circle key={`v-${s.name}-${i}`} cx={x} cy={y} r={2.4} fill={s.color} style={{ filter:`drop-shadow(0 0 3px ${s.color})` }}/>
            )))}
          </>
        ) : (
          <>
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
          </>
        )}

        {/* labels: EN mono + (단일 모드일 때만) 값. 호버/탭으로 스탯 설명 툴팁. */}
        {STATS.map((s,i)=>{
          const [x,y] = pt(i,1.28);
          return (
            <g key={"l"+i}
              onMouseEnter={e=>showTip(i,e)}
              onMouseLeave={()=>setTip(null)}
              onClick={e=>{ e.stopPropagation(); showTip(i,e); }}
              style={{ cursor:"help" }}
            >
              {/* 글자만으론 터치 표적이 너무 작아 투명 히트 영역을 깐다 */}
              <circle cx={x} cy={y+2} r={20} fill="transparent"/>
              <text x={x} y={y-3} textAnchor="middle" fill="#7DD3FC" style={{ font:"8.5px 'IBM Plex Mono',monospace", letterSpacing:"1.5px" }}>{s.en}</text>
              {!compareMode && (
                <text x={x} y={y+9} textAnchor="middle" fill="#64789c" style={{ font:"9px 'Noto Sans KR',sans-serif" }}>{s.label} {singleStats[s.key as keyof Stats]}</text>
              )}
            </g>
          );
        })}
      </svg>
      {tip && (
        <TooltipBubble
          rect={tip.rect}
          text={`${STATS[tip.i].label} · ${STATS[tip.i].en}\n${STATS[tip.i].desc}`}
        />
      )}
      {compareMode && (
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center" }}>
          {series!.map(s=>(
            <div key={s.name} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, boxShadow:`0 0 4px ${s.color}` }}/>
              <span style={{ fontSize:11.5, color:"#c6d6ef", fontFamily:"'Noto Sans KR'" }}>{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
