import { useEffect, useRef, useState } from "react";
import { STATS } from "../constants/stats";
import type { Stats } from "../types";
import { TooltipBubble, type TooltipRect } from "./primitives";

interface Series { id: number|string; name: string; color: string; stats: Stats; }

const DEFAULT_COLOR = "#8fd0ff";
const DEFAULT_VERTEX_COLOR = "#eef4ff";
// 사람이 여러 명일 때, 다음 사람의 별자리가 그려지기 시작하는 시점을 이만큼 늦춘다
// (완전히 순차적이지 않고 살짝 겹치게 해서 전체 애니메이션이 너무 늘어지지 않게 한다).
const ENTRY_STAGGER = 0.5;

// design.md §80: 육각 레이더를 별자리로 재해석 — 흐린 그리드 3겹 + 꼭짓점은 빛나는 별,
// 데이터 선은 하나씩 순차적으로 그려지는 애니메이션(stroke-dashoffset), 내부 채움은 은은하게.
//
// series가 주어지면(별 비교 화면) 여러 사람의 다각형을 겹쳐 그리는 비교 모드로 동작한다.
// 단일(stats)/비교(series) 모두 내부적으로 "entries" 배열 하나로 합쳐서 완전히 같은 방식
// (변 6개가 하나씩 그려지고 꼭짓점이 하나씩 팝인)으로 그리며, 사람이 여러 명이면 사람마다
// ENTRY_STAGGER만큼 시작 시점만 밀려서 한 명씩 순서대로 나타나는 것처럼 보인다.
// animate=false면(호출부에서 "이미 있던 별을 뺐을 때" 등) 애니메이션 없이 즉시 그려진다.
//
// entry의 식별자(id)를 이전 렌더와 비교해서, "새로 추가된" entry만 애니메이션을 재생한다.
// (예전엔 animate 하나가 전체 entries에 그대로 적용돼서, 이미 떠 있던 사람도 다른 사람이
// 추가/제거될 때마다 style의 animation 값이 다시 붙어 함께 재생되는 버그가 있었다.)
export function ConstellationChart({ stats, series, size=280, animate=true, id }: { stats?:Stats; series?:Series[]; size?:number; animate?:boolean; id?:number|string }) {
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

  // 단일/비교 모드를 하나의 배열로 합친다 — 렌더링 코드는 이 entries만 보고 그린다.
  const entries = series ?? [{ id: id ?? "single", name:"", color:DEFAULT_COLOR, stats:singleStats }];
  const entryPts = entries.map(en => STATS.map((st,i)=>pt(i, en.stats[st.key as keyof Stats]/100)));

  // 직전 렌더에 있던 entry id들을 기억해뒀다가, 이번 렌더에서 "새로 생긴" id만 골라낸다.
  // ref는 커밋 이후에만 갱신되므로 렌더 시점에는 항상 "이전" 값을 그대로 참조한다.
  const prevIdsRef = useRef<Set<number|string>>(new Set());
  useEffect(()=>{
    prevIdsRef.current = new Set(entries.map(en=>en.id));
  });

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

        {entries.map((en, e) => {
          const dataPts = entryPts[e];
          const entryDelay = e * ENTRY_STAGGER;
          const vertexColor = compareMode ? en.color : DEFAULT_VERTEX_COLOR;
          const edgeColor = compareMode ? en.color : DEFAULT_COLOR;
          const fillColor = compareMode ? `${en.color}22` : "rgba(125,211,252,.09)";
          // 이번에 새로 나타난 entry일 때만 애니메이션 style을 붙인다 — 이미 떠 있던 entry는
          // (id가 바뀌지 않았다면) 여기서 animation 값을 다시 부여하지 않으므로 재생되지 않는다.
          const isNew = animate && !prevIdsRef.current.has(en.id);
          return (
            <g key={"entry"+en.id}>
              {/* data fill */}
              <polygon
                points={dataPts.map(p=>p.join(",")).join(" ")}
                fill={fillColor}
                style={isNew ? { animation:`fadeIn .8s ${entryDelay+1.6}s both` } : undefined}
              />
              {/* edges, drawn one by one */}
              {[0,1,2,3,4,5].map(i=>{
                const [x1,y1] = dataPts[i], [x2,y2] = dataPts[(i+1)%6];
                return (
                  <line key={`e${en.id}-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={edgeColor} strokeWidth={1.5}
                    pathLength={1} strokeDasharray={1} strokeDashoffset={isNew?1:0}
                    style={{
                      animation: isNew ? `chartDraw .45s ease forwards ${entryDelay+0.35+i*0.22}s` : undefined,
                      filter: `drop-shadow(0 0 3px ${compareMode ? en.color : `rgba(125,211,252,${isNew?0.8:0.6})`})`,
                    }}/>
                );
              })}
              {/* vertex stars */}
              {dataPts.map(([x,y],i)=>(
                <circle key={`v${en.id}-${i}`} cx={x} cy={y} r={2.6} fill={vertexColor}
                  style={{ filter:`drop-shadow(0 0 4px ${vertexColor})`, animation: isNew ? `popIn .4s ease both ${entryDelay+0.3+i*0.22}s` : undefined }}/>
              ))}
            </g>
          );
        })}

        {/* labels: EN mono + (한 명일 때만) 값. 호버/탭으로 스탯 설명 툴팁. */}
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
              {entries.length===1 && (
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
