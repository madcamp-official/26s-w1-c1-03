import { useMemo } from "react";

// 시드 고정 선형합동생성기 — 매 렌더마다 별이 다시 흩뿌려지며 깜빡이지 않도록
// 컴포넌트 인스턴스당 한 번만 계산한다(design_example의 rnd() 방식과 동일).
function makeRng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

interface NebulaSpec { w:string; h:string; l:string; t:string; c:string; anim:"neb"|"nebB"; dur:string; }
const NEBULAE: NebulaSpec[] = [
  { w:"55vw", h:"48vh", l:"5vw",  t:"8vh",  c:"rgba(96,78,200,.15)",  anim:"neb",  dur:"26s" },
  { w:"48vw", h:"52vh", l:"48vw", t:"42vh", c:"rgba(56,120,220,.13)", anim:"nebB", dur:"31s" },
  { w:"34vw", h:"36vh", l:"26vw", t:"55vh", c:"rgba(64,190,180,.08)", anim:"neb",  dur:"38s" },
];

// design.md §5: 남색 그라데이션 + 표류하는 성운 2~3개 + 반짝이는 입자 별 ~70개.
// 모든 화면 공통 배경이므로 부모에 position:relative를 주고 이 컴포넌트를 절대배치로 깐다.
export function SpaceBackground({ density = 70 }: { density?: number }) {
  const dots = useMemo(() => {
    const rnd = makeRng(7);
    return Array.from({ length: density }, (_, i) => {
      const big = rnd() >= 0.85;
      const size = big ? 2 + rnd() * 1.6 : 1 + rnd() * 1.4;
      return {
        key: i,
        left: (rnd() * 100).toFixed(2) + "%",
        top: (rnd() * 100).toFixed(2) + "%",
        size,
        color: rnd() < 0.2 ? "#b9e3ff" : "#e8eefc",
        dur: (2.5 + rnd() * 5).toFixed(1) + "s",
        delay: (rnd() * 5).toFixed(1) + "s",
      };
    });
  }, [density]);

  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", background:"linear-gradient(160deg, #020617 0%, #081126 55%, #0B1736 100%)" }}>
      {NEBULAE.map((n,i)=>(
        <div key={i} style={{
          position:"absolute", width:n.w, height:n.h, left:n.l, top:n.t, borderRadius:"50%",
          background:`radial-gradient(closest-side, ${n.c}, transparent 70%)`,
          filter:"blur(30px)", animation:`${n.anim} ${n.dur} ease-in-out infinite`,
        }}/>
      ))}
      {dots.map(d=>(
        <div key={d.key} style={{
          position:"absolute", left:d.left, top:d.top, width:d.size, height:d.size, borderRadius:"50%",
          background:d.color, opacity:0.7,
          animation:`twk ${d.dur} ease-in-out ${d.delay} infinite`,
        }}/>
      ))}
    </div>
  );
}
