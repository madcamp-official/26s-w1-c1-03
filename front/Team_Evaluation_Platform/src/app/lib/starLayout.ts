import { starColorFor } from "../design-system/space";

// 사용자 id 기반 결정론적(=새로고침해도 안 변하는) 별 크기/반짝임 주기.
function seededRandom(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return s / 233280;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

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

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

// 처음 은하에 들어왔을 때(카메라 scale 1 = 화면이 정확히 0~100% 영역을 비춘다) 별이
// 전부 한눈에 들어오면 안 되고, 팬/줌으로 탐험해야 할 만큼은 넓어야 한다는 요구사항 —
// 아래 배치 공식이 만드는 상대적인 모양(타원 전체 윤곽·팀 클러스터·나선)은 그대로 두고,
// 마지막에 은하 중심(CENTER_X, CENTER_Y)에서 이 배수만큼 밀어내 화면 폭보다 넓게 펼친다.
const SPREAD = 1.8;

function clusterJitter(seed: number, amp = 1) {
  return (seededRandom(seed) - 0.5) * 2 * amp;
}

// 은하 배치(% 좌표, SPREAD 적용 전 기준):
// - 진행 중인 팀마다 화면에 클러스터 중심을 하나씩 두고, 팀원은 그 중심 주위에 뭉친다.
// - 여러 팀에 속한 사람은 소속 팀 중심들의 평균 지점에 놓여 양쪽 팀과 자연스럽게 이어진다.
// - 어느 팀에도 없는 사람은 클러스터 바깥 띠에 흩어 놓는다(팀이 하나도 없으면 전체 나선).
// 링 위 팀 중심 각도/반지름, 팀 안 멤버 각도/반지름 모두에 id 기반 결정론적 지터를 살짝
// 얹어, 수학적으로 너무 규칙적인(같은 간격으로 딱딱 맞아떨어지는) 느낌을 없앤다.
// teams는 정렬돼 들어온다고 가정하지 않고 내부에서 id로 정렬한다(색 배정과 동일한 순서).
export function galaxyPositions(ids: number[], teams: TeamCluster[]): Map<number, { x: number; y: number }> {
  const pos = new Map<number, { x: number; y: number }>();
  const sorted = [...teams].sort((a, b) => a.id - b.id);
  const T = sorted.length;

  // 팀 클러스터 중심: 팀이 하나면 중앙, 여럿이면 중앙을 둘러싼 타원 링에 흩어 놓되
  // 완전히 균등한 링이 되지 않도록 팀마다 각도/반지름을 조금씩 어긋나게 한다.
  const centers = sorted.map((team, k) => {
    if (T === 1) return { x: CENTER_X, y: CENTER_Y };
    const slot = (2 * Math.PI) / T;
    const a = -Math.PI / 2 + 0.6 + slot * k + clusterJitter(team.id * 31 + 1, slot * 0.28);
    const rJitter = 1 + clusterJitter(team.id * 31 + 2, 0.22);
    return { x: CENTER_X + 27 * rJitter * Math.cos(a), y: CENTER_Y + 22 * rJitter * Math.sin(a) };
  });

  // 팀 내부 배치: 멤버를 id 순으로 골든 앵글 소용돌이에 태우되, 반지름/각도에 각자의
  // id로 정해지는 작은 지터를 더해 나선이 너무 또렷하게 보이지 않게 한다.
  // 여러 팀 소속이면 각 팀에서의 위치를 평균 내 팀 사이에 놓는다.
  const perUser = new Map<number, { x: number; y: number }[]>();
  sorted.forEach((team, k) => {
    const members = [...new Set(team.memberIds)].sort((a, b) => a - b);
    const n = members.length;
    members.forEach((id, i) => {
      // 골든 앵글 나선은 원래 점을 disk 전체에 고르게 "펼치는" 용도라 반지름을 크게 두면
      // 같은 팀 멤버끼리도 서로 반대편까지 벌어져 뭉쳐 보이지 않는다. 팀은 뭉쳐 보여야
      // 하므로 반지름을 작게 눌러 좁은 덩어리 안에서만 나선을 그리게 한다.
      const frac = Math.sqrt((i + 0.5) / Math.max(n, 1));
      const rBase = n <= 1 ? 0 : T <= 1 ? 3 + 5 * frac : 2 + 3.5 * frac;
      const r = rBase * (1 + clusterJitter(id * 13 + 17, 0.15));
      const ang = i * GOLDEN_ANGLE + team.id + clusterJitter(id * 13 + 19, 0.5);
      const p = {
        x: centers[k].x + r * Math.cos(ang),
        y: centers[k].y + r * Math.sin(ang) * 0.85,
      };
      const list = perUser.get(id) ?? [];
      list.push(p);
      perUser.set(id, list);
    });
  });
  perUser.forEach((list, id) => {
    const x = list.reduce((s, p) => s + p.x, 0) / list.length;
    const y = list.reduce((s, p) => s + p.y, 0) / list.length;
    pos.set(id, { x, y });
  });

  // 무소속 별: 팀이 없으면 화면 전체 나선, 팀이 있으면 클러스터 바깥 띠에 흩뿌린다.
  const rest = ids.filter(id => !pos.has(id));
  const m = Math.max(rest.length, 1);
  rest.forEach((id, j) => {
    const ang = j * GOLDEN_ANGLE + 2.1 + clusterJitter(id * 13 + 23, 0.4);
    let x: number, y: number;
    if (T === 0) {
      const rFrac = Math.sqrt((j + 0.5) / m);
      x = CENTER_X + rFrac * 40 * Math.cos(ang);
      y = CENTER_Y + rFrac * 36 * Math.sin(ang);
    } else {
      const band = 0.88 + 0.24 * seededRandom(id * 13 + 3);
      x = CENTER_X + 42 * band * Math.cos(ang);
      y = CENTER_Y + 34 * band * Math.sin(ang);
    }
    pos.set(id, { x, y });
  });

  // 은하 중심에서 SPREAD배 밀어낸다 — 상대적 배치(팀 클러스터·나선 모양)는 그대로 유지된다.
  ids.forEach(id => {
    const p = pos.get(id);
    if (!p) return;
    p.x = CENTER_X + (p.x - CENTER_X) * SPREAD;
    p.y = CENTER_Y + (p.y - CENTER_Y) * SPREAD;
  });

  // 같은 팀인 별끼리는 뭉쳐 보여야 하므로 거의 겹칠 때만(TEAM_MIN_DIST) 살짝 떼어놓고,
  // 서로 다른 팀/무소속 별끼리는 더 크게(CROSS_MIN_DIST) 밀어내 클러스터 사이 여백을
  // 지킨다 — 모든 쌍에 같은 최소 거리를 적용하면 팀이 뭉쳐 보이지 않고 격자처럼
  // 규칙적으로 흩어져 버렸던 이전 방식의 문제를 이 구분으로 해결한다.
  const teamsOf = new Map<number, Set<number>>();
  sorted.forEach(team => {
    new Set(team.memberIds).forEach(id => {
      const s = teamsOf.get(id) ?? new Set<number>();
      s.add(team.id);
      teamsOf.set(id, s);
    });
  });
  const shareTeam = (a: number, b: number) => {
    const sa = teamsOf.get(a), sb = teamsOf.get(b);
    if (!sa || !sb) return false;
    for (const t of sa) if (sb.has(t)) return true;
    return false;
  };

  relaxMinDistance(pos, ids, shareTeam);
  return pos;
}

// 소용돌이/나선 배치는 곡선을 따라 별을 촘촘히 늘어놓다 보니 서로 다른 클러스터/무소속
// 별들끼리 거의 겹칠 만큼 붙는 경우가 있었다. 완성된 배치 위에 "이 거리보다 가까우면
// 서로 밀어낸다"는 단순한 반발 이완(relaxation)을 몇 차례 더 돌려 클러스터 사이 여백을
// 보장한다. 입력이 같으면 항상 같은 결과가 나오도록 무작위성은 쓰지 않는다(완전히 겹친
// 두 별만 id 기반 결정론적 각도로 떼어놓는다).
const TEAM_MIN_DIST = 4.5;
const CROSS_MIN_DIST = 20;
const RELAX_ITERATIONS = 80;

function relaxMinDistance(
  pos: Map<number, { x: number; y: number }>,
  ids: number[],
  shareTeam: (a: number, b: number) => boolean
) {
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
    if (!moved) break;
  }
  // 화면(0~100%) 안에 가두는 클램프가 아니라, 서로를 계속 밀어내다 좌표가 터무니없이
  // 발산하는 것만 막는 아주 느슨한 안전망이다 — 은하가 화면 밖으로 넘치는 건 의도된 동작.
  ids.forEach(id => {
    const p = pos.get(id);
    if (!p) return;
    p.x = clamp(p.x, -600, 700);
    p.y = clamp(p.y, -600, 692);
  });
}
