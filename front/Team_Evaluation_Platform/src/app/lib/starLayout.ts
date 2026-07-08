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

// 팀별 별자리 선/범례 색. 별 코어 색(청백/순백/보라)과 겹치지 않게 알파를 낮춘 변주.
const TEAM_LINE_COLORS = [
  { line: "rgba(125,211,252,.38)", solid: "#7DD3FC" },
  { line: "rgba(94,234,212,.38)",  solid: "#5EEAD4" },
  { line: "rgba(167,139,250,.42)", solid: "#A78BFA" },
  { line: "rgba(251,191,36,.34)",  solid: "#FBBF24" },
  { line: "rgba(244,114,182,.36)", solid: "#F472B6" },
  { line: "rgba(147,197,253,.38)", solid: "#93C5FD" },
];
export function teamLineColorFor(index: number) {
  return TEAM_LINE_COLORS[index % TEAM_LINE_COLORS.length];
}

const CENTER_X = 50, CENTER_Y = 46;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

// 은하 배치(% 좌표):
// - 진행 중인 팀마다 화면에 클러스터 중심을 하나씩 두고, 팀원은 그 중심 주위에 소용돌이로 뭉친다.
// - 여러 팀에 속한 사람은 소속 팀 중심들의 평균 지점에 놓여 양쪽 팀과 자연스럽게 이어진다.
// - 어느 팀에도 없는 사람은 클러스터 바깥 띠에 흩어 놓는다(팀이 하나도 없으면 전체 나선).
// teams는 정렬돼 들어온다고 가정하지 않고 내부에서 id로 정렬한다(색 배정과 동일한 순서).
export function galaxyPositions(ids: number[], teams: TeamCluster[]): Map<number, { x: number; y: number }> {
  const pos = new Map<number, { x: number; y: number }>();
  const sorted = [...teams].sort((a, b) => a.id - b.id);
  const T = sorted.length;

  // 팀 클러스터 중심: 팀이 하나면 중앙, 여럿이면 중앙을 둘러싼 타원 링에 고르게.
  const centers = sorted.map((_, k) => {
    if (T === 1) return { x: CENTER_X, y: CENTER_Y };
    const a = -Math.PI / 2 + 0.6 + (2 * Math.PI * k) / T;
    return { x: CENTER_X + 27 * Math.cos(a), y: CENTER_Y + 22 * Math.sin(a) };
  });

  // 팀 내부 배치: 팀마다 멤버를 id 순으로 골든 앵글 소용돌이에 태운다.
  // 여러 팀 소속이면 각 팀에서의 위치를 평균 내 팀 사이에 놓는다.
  const perUser = new Map<number, { x: number; y: number }[]>();
  sorted.forEach((team, k) => {
    const members = [...new Set(team.memberIds)].sort((a, b) => a - b);
    const n = members.length;
    members.forEach((id, i) => {
      const frac = Math.sqrt((i + 0.5) / Math.max(n, 1));
      const r = n <= 1 ? 0 : T <= 1 ? 8 + 16 * frac : 5 + 8 * frac;
      const ang = i * GOLDEN_ANGLE + team.id;
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
    pos.set(id, { x: clamp(x, 5, 95), y: clamp(y, 8, 88) });
  });

  // 무소속 별: 팀이 없으면 화면 전체 나선, 팀이 있으면 클러스터 바깥 띠에 흩뿌린다.
  const rest = ids.filter(id => !pos.has(id));
  const m = Math.max(rest.length, 1);
  rest.forEach((id, j) => {
    const ang = j * GOLDEN_ANGLE + 2.1;
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
    pos.set(id, { x: clamp(x, 5, 95), y: clamp(y, 8, 88) });
  });

  return pos;
}
