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
// 모든 화면 공통 배경. position:fixed로 뷰포트 전체에 깔아 화면 내부 스크롤(overflowY:auto)이
// 얼마나 길어지든 배경이 잘리지 않게 한다(예전엔 absolute라 스크롤 컨테이너의 1개 화면
// 높이만큼만 채워져서, 아래로 스크롤하면 배경이 끝나고 검은 여백이 보이는 버그가 있었다).
//
// driftX/driftY/driftScale: 은하 화면처럼 카메라를 드래그/휠줌하는 화면에서, 배경이 화면에
// 아예 고정된 것처럼 보이지 않도록 카메라 움직임의 일부만 따라가는 패럴랙스 효과를 주는
// 선택적 값. 성운(더 먼 레이어)은 더 적게, 별 입자(더 가까운 레이어)는 조금 더 따라가게
// 해서 원근감을 준다. 값을 안 주면(기본 0/1) 기존처럼 완전히 고정된 배경이 된다.
export function SpaceBackground({ density = 70, driftX = 0, driftY = 0, driftScale = 1 }: { density?: number; driftX?: number; driftY?: number; driftScale?: number }) {
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

  const nebScale = 1 + (driftScale - 1) * 0.5;
  const starScale = 1 + (driftScale - 1) * 0.25;

  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none", background:"linear-gradient(160deg, #020617 0%, #081126 55%, #0B1736 100%)" }}>
      <div style={{ position:"absolute", inset:0, transform:`translate(${driftX*0.35}px, ${driftY*0.35}px) scale(${nebScale})`, transition:"transform 0.4s ease-out" }}>
        {NEBULAE.map((n,i)=>(
          <div key={i} style={{
            position:"absolute", width:n.w, height:n.h, left:n.l, top:n.t, borderRadius:"50%",
            background:`radial-gradient(closest-side, ${n.c}, transparent 70%)`,
            filter:"blur(30px)", animation:`${n.anim} ${n.dur} ease-in-out infinite`,
          }}/>
        ))}
      </div>
      <div style={{ position:"absolute", inset:0, transform:`translate(${driftX*0.6}px, ${driftY*0.6}px) scale(${starScale})`, transition:"transform 0.4s ease-out" }}>
        {dots.map(d=>(
          <div key={d.key} style={{
            position:"absolute", left:d.left, top:d.top, width:d.size, height:d.size, borderRadius:"50%",
            background:d.color, opacity:0.7,
            animation:`twk ${d.dur} ease-in-out ${d.delay} infinite`,
          }}/>
        ))}
      </div>
    </div>
  );
}
