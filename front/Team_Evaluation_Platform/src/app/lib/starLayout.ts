import { starColorFor } from "../design-system/space";

// 사용자 id 기반 결정론적(=새로고침해도 안 변하는) 별 크기/반짝임 주기.
function seededRandom(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return s / 233280;
}

export interface StarAppearance {
  size: number;
  color: string; glowC: string;
  breathe: string;
}

// 한 번도 로그인/비밀번호 변경을 하지 않은(=가입을 마치지 않은) 계정의 별 색 — 능력치도
// 등급도 없으니 다른 별들과 뚜렷이 구분되는 탁한 회색으로 그린다.
export const UNREGISTERED_TINT = { color: "#5b6472", glowC: "91,100,114" };

// 크기/반짝임처럼 "그 사람 고유의" 외형 — 배치와 무관하게 id로만 결정된다.
// tint를 주면 색만 그 값(예: 밝기 등급 색)으로 바꾸고, 없으면 기존 id 기반 색을 쓴다.
export function starAppearanceFor(id: number, tint?: { color: string; glowC: string }): StarAppearance {
  const r1 = seededRandom(id * 13 + 1);
  const r2 = seededRandom(id * 13 + 2);
  const { color, glowC } = tint ?? starColorFor(id);
  return {
    size: 12 + r1 * 9,
    color, glowC,
    breathe: `${(2.6 + r2 * 1.8).toFixed(1)}s`,
  };
}

// 마감이 지나지 않은(=아직 진행 중인) 팀 하나 — 은하에서 별들이 뭉치는 단위.
export interface TeamCluster {
  id: number;
  name: string;
  memberIds: number[];
}

// 팀별 별자리 선/범례 색. 여러 팀에 속한 사람은 선 여러 개가 한 별에서 만나므로,
// 색끼리 헷갈리지 않도록 색상환에서 고르게 떨어진 6색을 진한 알파로 쓴다.
const TEAM_LINE_COLORS = [
  { line: "rgba(56,189,248,.6)",   solid: "#38BDF8" }, // 하늘
  { line: "rgba(251,113,133,.58)", solid: "#FB7185" }, // 장미
  { line: "rgba(163,230,53,.58)",  solid: "#A3E635" }, // 라임
  { line: "rgba(192,132,252,.6)",  solid: "#C084FC" }, // 보라
  { line: "rgba(251,191,36,.6)",   solid: "#FBBF24" }, // 호박
  { line: "rgba(251,146,60,.58)",  solid: "#FB923C" }, // 주황
];
export function teamLineColorFor(index: number) {
  return TEAM_LINE_COLORS[index % TEAM_LINE_COLORS.length];
}

const CENTER_X = 50, CENTER_Y = 46;

// 처음 은하에 들어왔을 때(카메라 scale 1 = 화면이 정확히 0~100% 영역을 비춘다) 별이
// 전부 한눈에 들어오면 안 되고, 팬/줌으로 탐험해야 할 만큼은 넓어야 한다는 요구사항 —
// 아래 배치 공식이 만드는 상대적인 모양은 그대로 두고, 마지막에 은하 중심에서 이 배수만큼
// 밀어내 화면 폭보다 넓게 펼친다.
const SPREAD = 1.8;
// 팀 슬라이스/무소속 공통 반지름 상한(SPREAD 적용 전, % 기준) — 팀 소속 여부와 무관하게
// 모든 별이 같은 반지름 범위(중심~이 값)에서 뽑히므로, "팀은 중앙에 뭉치고 무소속은 바깥
// 테두리에 링을 이룬다"는 구역 구분이 생기지 않는다.
const RADIUS_MAX = 42;
// 완전한 원이 아니라 살짝 눌린 타원으로 펼치는 y축 비율(기존 화면 비율과 맞춘 값).
const Y_SQUISH = 0.85;

function clusterJitter(seed: number, amp = 1) {
  return (seededRandom(seed) - 0.5) * 2 * amp;
}

interface Slice { start: number; end: number; }

// 팀끼리 멤버를 공유하면(한 사람이 여러 팀 소속) 그 두 팀을 원형 순서에서 최대한
// 이웃하게 배치한다 — 이웃한 두 팀은 슬라이스 경계를 공유하므로, 공유 멤버를 정확히 그
// 경계 각도에 놓으면 두 팀 모두의 별자리 선과 자연스럽게 만나면서도 어느 팀의 선도
// 서로 교차하지 않는다(각 슬라이스는 180°보다 좁은 부채꼴이라 볼록 영역이고, 서로 다른
// 슬라이스는 겹치지 않으므로 한 슬라이스 안의 선분이 다른 슬라이스 안의 선분과 만날 수
// 없다). 그리디하게 "지금까지 놓은 팀과 공유 인원이 가장 많은 팀"을 계속 이어 붙인다.
function orderTeamsForAdjacency(teams: TeamCluster[]): TeamCluster[] {
  if (teams.length <= 2) return teams;
  const memberSets = new Map(teams.map(t => [t.id, new Set(t.memberIds)]));
  const byId = new Map(teams.map(t => [t.id, t]));
  function overlap(aId: number, bId: number): number {
    const a = memberSets.get(aId)!, b = memberSets.get(bId)!;
    let c = 0;
    a.forEach(m => { if (b.has(m)) c++; });
    return c;
  }
  const remaining = new Set(teams.map(t => t.id));
  const order: TeamCluster[] = [teams[0]];
  remaining.delete(teams[0].id);
  let cur = teams[0];
  while (remaining.size > 0) {
    let bestId = -1, bestScore = -1;
    remaining.forEach(id => {
      const score = overlap(cur.id, id);
      if (score > bestScore || (score === bestScore && (bestId === -1 || id < bestId))) {
        bestScore = score; bestId = id;
      }
    });
    cur = byId.get(bestId)!;
    order.push(cur);
    remaining.delete(bestId);
  }
  return order;
}

// 원 전체(2π)를 팀 수만큼 부채꼴로 나눈다 — 인원이 많은 팀일수록 살짝 넓게, 폭에는 약간의
// 지터를 줘서 파이차트처럼 딱 맞아떨어지는 느낌을 없앤다. 폭 합이 정확히 2π가 되도록
// 정규화해 슬라이스끼리 완전히 맞닿고(경계 공유), 틈이나 겹침이 생기지 않게 한다.
function assignSlices(orderedTeams: TeamCluster[]): Map<number, Slice> {
  const map = new Map<number, Slice>();
  const n = orderedTeams.length;
  if (n === 0) return map;
  const globalStart = -Math.PI / 2 + 0.4;
  if (n === 1) {
    map.set(orderedTeams[0].id, { start: globalStart, end: globalStart + Math.PI * 2 });
    return map;
  }
  const rawWidths = orderedTeams.map(t => {
    const size = new Set(t.memberIds).size;
    return Math.max(0.4, 1 + 0.22 * Math.max(0, size - 1) + clusterJitter(t.id * 41 + 7, 0.3));
  });
  const total = rawWidths.reduce((a, b) => a + b, 0);
  const scale = (Math.PI * 2) / total;
  let cursor = globalStart;
  orderedTeams.forEach((t, k) => {
    const w = rawWidths[k] * scale;
    map.set(t.id, { start: cursor, end: cursor + w });
    cursor += w;
  });
  return map;
}

function sliceCenterAngle(sl: Slice): number {
  return (sl.start + sl.end) / 2;
}

// 여러 각도의 "원형 평균"(벡터 합) — 산술평균은 0°/360° 경계에서 반대편으로 튈 수 있다.
function circularMeanOf(angles: number[]): number {
  let sx = 0, sy = 0;
  angles.forEach(a => { sx += Math.cos(a); sy += Math.sin(a); });
  return Math.atan2(sy, sx);
}

// 별 하나의 각도 제약: 무소속(free)은 전체 원 어디든, 팀 하나 소속(range)은 그 팀의
// 슬라이스 범위 안 어디든, 여러 팀 소속(fixed)은 (가능하면) 이웃한 두 슬라이스가 만나는
// 경계 각도에 정확히 고정한다.
type AngleConstraint =
  | { kind: "free" }
  | { kind: "range"; lo: number; hi: number }
  | { kind: "fixed"; angle: number };

// 은하 배치(% 좌표, SPREAD 적용 전 기준):
// - 진행 중인 팀마다 원 둘레의 부채꼴(슬라이스) 하나씩을 배정받고, 팀원은 그 슬라이스 안
//   반지름 0~RADIUS_MAX 전 구간에 걸쳐 무작위로 흩어진다 — 팀 소속 여부와 무관하게 모든
//   별이 같은 반지름 범위를 쓰므로 "팀은 중앙에, 무소속은 테두리 링에"라는 구역이 생기지
//   않는다.
// - 무소속 별은 슬라이스 제약이 아예 없어 원 전체 어디든 자유롭게 놓인다(선으로 연결되지
//   않으므로 다른 선과 교차할 일도 없다).
// - 여러 팀에 속한 사람은 그 팀들의 슬라이스가 만나는 경계 각도에 놓여 양쪽 팀과 자연스럽게
//   이어진다(3개 이상 팀에 걸치는 드문 경우는 각 팀 슬라이스 중심의 원형 평균으로 절충한다).
// teams는 정렬돼 들어온다고 가정하지 않고 내부에서 id로 정렬한다(색 배정과 동일한 순서).
export function galaxyPositions(ids: number[], teams: TeamCluster[]): Map<number, { x: number; y: number }> {
  const pos = new Map<number, { x: number; y: number }>();
  const sorted = [...teams].sort((a, b) => a.id - b.id);

  const teamsOf = new Map<number, Set<number>>();
  sorted.forEach(team => {
    new Set(team.memberIds).forEach(id => {
      const s = teamsOf.get(id) ?? new Set<number>();
      s.add(team.id);
      teamsOf.set(id, s);
    });
  });

  const orderedTeams = orderTeamsForAdjacency(sorted);
  const orderIndex = new Map(orderedTeams.map((t, k) => [t.id, k]));
  const slices = assignSlices(orderedTeams);

  const constraints = new Map<number, AngleConstraint>();
  ids.forEach(id => {
    const myTeams = [...(teamsOf.get(id) ?? [])];
    if (myTeams.length === 0) {
      constraints.set(id, { kind: "free" });
    } else if (myTeams.length === 1) {
      const sl = slices.get(myTeams[0])!;
      constraints.set(id, { kind: "range", lo: sl.start, hi: sl.end });
    } else if (myTeams.length === 2) {
      const idxs = myTeams.map(tid => orderIndex.get(tid)!).sort((a, b) => a - b);
      let fixedAngle: number | null = null;
      if (idxs[1] === idxs[0] + 1) {
        fixedAngle = slices.get(orderedTeams[idxs[1]].id)!.start;
      } else if (idxs[0] === 0 && idxs[1] === orderedTeams.length - 1 && orderedTeams.length > 1) {
        fixedAngle = slices.get(orderedTeams[0].id)!.start;
      }
      constraints.set(id, {
        kind: "fixed",
        angle: fixedAngle ?? circularMeanOf(myTeams.map(tid => sliceCenterAngle(slices.get(tid)!))),
      });
    } else {
      // 3개 이상 팀에 걸치는 아주 드문 경우 — 모든 슬라이스 경계를 동시에 만족시킬 순
      // 없으므로 중심각들의 원형 평균으로 절충한다(최선 노력, 교차 완전 보장은 아님).
      constraints.set(id, {
        kind: "fixed",
        angle: circularMeanOf(myTeams.map(tid => sliceCenterAngle(slices.get(tid)!))),
      });
    }
  });

  ids.forEach(id => {
    const c = constraints.get(id)!;
    const rFrac = Math.sqrt(seededRandom(id * 13 + 20));
    const r = rFrac * RADIUS_MAX;
    let ang: number;
    if (c.kind === "free") {
      ang = seededRandom(id * 13 + 18) * Math.PI * 2;
    } else if (c.kind === "fixed") {
      ang = c.angle;
    } else {
      ang = c.lo + seededRandom(id * 13 + 18) * (c.hi - c.lo);
    }
    pos.set(id, { x: CENTER_X + r * Math.cos(ang), y: CENTER_Y + r * Math.sin(ang) * Y_SQUISH });
  });

  // 은하 중심에서 SPREAD배 밀어낸다 — 상대적 배치(부채꼴 모양)는 그대로 유지된다.
  ids.forEach(id => {
    const p = pos.get(id);
    if (!p) return;
    p.x = CENTER_X + (p.x - CENTER_X) * SPREAD;
    p.y = CENTER_Y + (p.y - CENTER_Y) * SPREAD;
  });

  // 같은 팀인 별끼리는 거의 겹칠 때만(TEAM_MIN_DIST) 살짝 떼어놓고, 서로 다른 팀/무소속
  // 별끼리는 더 크게(CROSS_MIN_DIST) 밀어내 너무 다닥다닥 붙어 보이지 않게 한다.
  const shareTeam = (a: number, b: number) => {
    const sa = teamsOf.get(a), sb = teamsOf.get(b);
    if (!sa || !sb) return false;
    for (const t of sa) if (sb.has(t)) return true;
    return false;
  };

  relaxMinDistance(pos, ids, shareTeam, constraints);
  return pos;
}

// 반발 이완(relaxation): "이 거리보다 가까우면 서로 밀어낸다"를 몇 차례 반복해 너무
// 다닥다닥 붙은 별들 사이에 여백을 보장한다. 입력이 같으면 항상 같은 결과가 나오도록
// 무작위성은 쓰지 않는다(완전히 겹친 두 별만 id 기반 결정론적 각도로 떼어놓는다).
const TEAM_MIN_DIST = 4.5;
const CROSS_MIN_DIST = 20;
const RELAX_ITERATIONS = 80;
// 서로 밀어내다 은하 중심에서 너무 멀리 발산해 찾아가기 힘들어지는 걸 막는 상한(중심에서의
// 거리, % 기준). 화면 밖으로 넘치는 탐험 범위 자체는 의도된 동작이라 값은 넉넉히 둔다.
const MAX_RADIUS_FROM_CENTER = 130;

// 각도 제약(자기 팀 슬라이스 범위 안 / 경계 고정)을 강제한다 — 반지름(중심에서의 거리)은
// 그대로 둔 채 각도만 유효 범위로 되돌린다.
function reprojectAngles(
  pos: Map<number, { x: number; y: number }>,
  ids: number[],
  constraints: Map<number, AngleConstraint>
) {
  const twoPi = Math.PI * 2;
  ids.forEach(id => {
    const p = pos.get(id);
    const c = constraints.get(id);
    if (!p || !c || c.kind === "free") return;
    const ux = p.x - CENTER_X, uy = (p.y - CENTER_Y) / Y_SQUISH;
    const r = Math.hypot(ux, uy);
    if (r < 0.0001) return;
    let ang = Math.atan2(uy, ux);
    if (c.kind === "fixed") {
      ang = c.angle;
    } else {
      while (ang < c.lo) ang += twoPi;
      while (ang >= c.lo + twoPi) ang -= twoPi;
      ang = Math.min(c.hi, Math.max(c.lo, ang));
    }
    p.x = CENTER_X + r * Math.cos(ang);
    p.y = CENTER_Y + r * Math.sin(ang) * Y_SQUISH;
  });
}

function relaxMinDistance(
  pos: Map<number, { x: number; y: number }>,
  ids: number[],
  shareTeam: (a: number, b: number) => boolean,
  constraints: Map<number, AngleConstraint>
) {
  // 각도 제약이 있는 별은 반지름 방향으로만 실제로 자유롭다 — 매 반복마다 밀어낸 직후
  // 바로 각도를 되돌려야, 다른(다른 각도의) 별에 떠밀려 슬라이스를 벗어났다가 마지막에야
  // 한 번에 스냅되면서 그동안 벌어놓은 간격이 도로 사라지는 일이 없다(경계 각도에 고정된
  // 두 별처럼, 서로를 밀어낼 수 있는 방향이 반지름뿐인 경우 특히 중요).
  for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) {
      const a = pos.get(ids[i]);
      if (!a) continue;
      for (let j = i + 1; j < ids.length; j++) {
        const b = pos.get(ids[j]);
        if (!b) continue;
        const minDist = shareTeam(ids[i], ids[j]) ? TEAM_MIN_DIST : CROSS_MIN_DIST;
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= minDist) continue;
        if (d < 0.0001) {
          const ang = seededRandom(ids[i] * 97 + ids[j] * 131) * Math.PI * 2;
          dx = Math.cos(ang); dy = Math.sin(ang); d = 1;
        }
        const push = (minDist - d) / 2;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
        moved = true;
      }
    }
    reprojectAngles(pos, ids, constraints);
    if (!moved) break;
  }

  // 화면(0~100%) 안에 가두는 클램프가 아니라, 은하 중심에서 너무 멀리(찾아가기 힘들 만큼)
  // 발산하는 것만 막는 안전망이다 — 화면 밖으로 넘치는 정도의 탐험 범위는 의도된 동작이다.
  ids.forEach(id => {
    const p = pos.get(id);
    if (!p) return;
    const dx = p.x - CENTER_X, dy = p.y - CENTER_Y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS_FROM_CENTER) {
      const k = MAX_RADIUS_FROM_CENTER / dist;
      p.x = CENTER_X + dx * k;
      p.y = CENTER_Y + dy * k;
    }
  });
}
