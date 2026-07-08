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
const Y_SQUISH = 0.85;
// 팀(별자리)/무소속 별 공통 반지름 상한(SPREAD 적용 전, % 기준) — 팀 소속 여부와 무관하게
// 모두 같은 범위에서 뽑히므로 "팀은 중앙에, 무소속은 테두리에" 같은 구역이 생기지 않는다.
const RADIUS_MAX = 42;
// 은하 중심에서 이 배수만큼 밀어내 화면 폭보다 넓게 펼친다(팬/줌 탐험 여지 확보).
const SPREAD = 1.8;
// 서로 밀어내다 은하 중심에서 너무 멀리 발산해 찾아가기 힘들어지는 걸 막는 상한.
const MAX_RADIUS_FROM_CENTER = 130;

// ─── 실제 별자리를 본뜬 모양 라이브러리 ──────────────────────────────────────
// 각 모양은 "국자/북두칠성(그릇+손잡이)", "카시오페아 W자 지그재그", "백조자리(중심별에서
// 사방으로 뻗는 십자)"를 단순화해 본뜬 좌표(대략 -1~1.3 범위)와, 그 실제 별자리가 잇는
// 선(edges)을 그대로 담는다 — 최단거리 트리(MST)로 계산하는 대신 미리 정해둔 선분만 쓰므로
// 엉뚱한 별이 선 위에 걸치는 일이 없다.
//
// points는 항상 "각 점이 자신보다 앞선 인덱스의 점 하나와 반드시 연결되는" 순서로 설계돼
// 있어(트리 구조), 팀 인원이 모양의 점 개수보다 적으면 앞 k개만 잘라 써도(prefix) 항상
// 이어져 있고, 인원이 더 많으면 마지막 점에서 꼬리를 이어 붙여(extend) 확장할 수 있다.
interface ShapeDef { points: [number, number][]; edges: [number, number][]; }

const SHAPES: ShapeDef[] = [
  // 북두칠성: 그릇(사각형, 닫힌 변 포함) + 손잡이(꺾인 선)
  {
    points: [[-1.0, 0.0], [-0.7, 0.55], [-0.05, 0.5], [-0.15, -0.05], [0.55, -0.2], [0.95, 0.15], [1.3, 0.6]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  // 카시오페아: W자 지그재그(순수 경로)
  {
    points: [[-1.0, 0.2], [-0.5, -0.35], [0.0, 0.25], [0.5, -0.35], [1.0, 0.2]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  // 백조자리: 중심별에서 네 방향으로 뻗는 십자(선들이 실제 별 위에서 만난다 — 빈 공간에서
  // 교차하는 게 아니므로 "선끼리 교차"에 해당하지 않는다)
  {
    points: [[0, 0], [0, -1.0], [0, 0.9], [-0.85, -0.15], [0.85, -0.15]],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4]],
  },
];

// 모양 하나를 팀의 실제 인원 수에 맞춘다: 인원이 모양의 점 개수보다 적으면 앞부분만 자르고
// (그 안의 선분들은 두 끝점이 모두 잘린 범위 안에 있을 때만 남긴다 — 트리 구조라 항상
// 연결돼 있다), 더 많으면 마지막 점에서부터 방향을 조금씩 틀며 꼬리를 이어 붙인다.
function buildShapeForSize(shapeIdx: number, size: number, seed: number): ShapeDef {
  const base = SHAPES[shapeIdx % SHAPES.length];
  if (size <= 0) return { points: [], edges: [] };
  if (size <= base.points.length) {
    return {
      points: base.points.slice(0, size),
      edges: base.edges.filter(([a, b]) => a < size && b < size),
    };
  }
  const points: [number, number][] = base.points.map(p => [p[0], p[1]]);
  const edges: [number, number][] = base.edges.map(e => [e[0], e[1]]);
  const [lastX0, lastY0] = points[points.length - 1];
  const [prevX0, prevY0] = points[points.length - 2] ?? [lastX0 - 1, lastY0];
  let dirAngle = Math.atan2(lastY0 - prevY0, lastX0 - prevX0);
  let lx = lastX0, ly = lastY0;
  for (let i = base.points.length; i < size; i++) {
    let bestCand: [number, number] | null = null;
    let bestClearance = -Infinity;
    let bestAngle = dirAngle;
    for (let t = 0; t < 10; t++) {
      const tryAngle = dirAngle + (seededRandom(seed + i * 31 + t * 7 + 3) - 0.5) * 1.1;
      const step = 0.55 + seededRandom(seed + i * 17 + t * 11 + 5) * 0.25;
      const nx = lx + Math.cos(tryAngle) * step, ny = ly + Math.sin(tryAngle) * step;
      // 새 꼬리점이 기존 점/선분에서 충분히 떨어지는지뿐 아니라, 새로 생기는 변(직전
      // 점→새 점) 자체가 다른 기존 점 옆을 스치듯 지나가지 않는지도 함께 확인한다 —
      // 그렇지 않으면 그 점은 안 겹쳐도 새로 그어지는 선 위에 다른 별이 걸치게 된다.
      let minD = Infinity;
      for (const [px, py] of points) minD = Math.min(minD, Math.hypot(nx - px, ny - py));
      for (const [ea, eb] of edges) {
        minD = Math.min(minD, pointSegDist(nx, ny, points[ea][0], points[ea][1], points[eb][0], points[eb][1]));
      }
      points.forEach((p, pi) => {
        if (pi === points.length - 1) return; // 직전 점(새 변의 다른 끝점)은 제외
        minD = Math.min(minD, pointSegDist(p[0], p[1], lx, ly, nx, ny));
      });
      if (minD > bestClearance) { bestClearance = minD; bestCand = [nx, ny]; bestAngle = tryAngle; }
    }
    edges.push([i - 1, i]);
    points.push(bestCand!);
    lx = bestCand![0]; ly = bestCand![1];
    dirAngle = bestAngle;
  }
  return { points, edges };
}

function segmentsCross(
  a1: [number, number], a2: [number, number], b1: [number, number], b2: [number, number]
): boolean {
  function cross(ox: number, oy: number, ax: number, ay: number, bx: number, by: number) {
    return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
  }
  const d1 = cross(b1[0], b1[1], b2[0], b2[1], a1[0], a1[1]);
  const d2 = cross(b1[0], b1[1], b2[0], b2[1], a2[0], a2[1]);
  const d3 = cross(a1[0], a1[1], a2[0], a2[1], b1[0], b1[1]);
  const d4 = cross(a1[0], a1[1], a2[0], a2[1], b2[0], b2[1]);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function pointSegDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ─── 팀을 "공유 멤버로 이어진 그룹"으로 묶기 ───────────────────────────────────
// 두 팀에 동시에 속한 사람이 있으면 그 두 팀은 같은 그룹으로 묶여, 서로의 별자리 모양이
// 그 사람 위치에서 이어붙는다(요청: "두 별자리를 그 사람 위치에서 이어붙임").
function groupTeams(teams: TeamCluster[]): TeamCluster[][] {
  const parent = new Map<number, number>(teams.map(t => [t.id, t.id]));
  function find(x: number): number {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let cur = x;
    while (parent.get(cur) !== r) { const next = parent.get(cur)!; parent.set(cur, r); cur = next; }
    return r;
  }
  function union(a: number, b: number) { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); }

  const teamsByMember = new Map<number, number[]>();
  teams.forEach(t => new Set(t.memberIds).forEach(uid => {
    const arr = teamsByMember.get(uid) ?? [];
    arr.push(t.id);
    teamsByMember.set(uid, arr);
  }));
  teamsByMember.forEach(tids => { for (let i = 1; i < tids.length; i++) union(tids[0], tids[i]); });

  const byRoot = new Map<number, TeamCluster[]>();
  teams.forEach(t => {
    const r = find(t.id);
    const arr = byRoot.get(r) ?? [];
    arr.push(t);
    byRoot.set(r, arr);
  });
  return [...byRoot.values()];
}

interface TeamAdjacency { otherTeamId: number; sharedUserId: number; }

// 그룹 안에서 팀끼리 공유하는 멤버 관계(어느 팀과 어느 팀이 누구를 공유하는지).
function teamAdjacencyWithin(group: TeamCluster[]): Map<number, TeamAdjacency[]> {
  const adj = new Map<number, TeamAdjacency[]>();
  group.forEach(t => adj.set(t.id, []));
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i], b = group[j];
      const bSet = new Set(b.memberIds);
      let shared = -1;
      new Set(a.memberIds).forEach(uid => {
        if (bSet.has(uid) && (shared === -1 || uid < shared)) shared = uid;
      });
      if (shared !== -1) {
        adj.get(a.id)!.push({ otherTeamId: b.id, sharedUserId: shared });
        adj.get(b.id)!.push({ otherTeamId: a.id, sharedUserId: shared });
      }
    }
  }
  return adj;
}

const BASE_SCALE = 8;

// 후보 위치를 매번 독립적인(각도·반지름 모두 무작위) 위치로 찍어보다가, 링 하나를 다
// 써버리면 다음 링(반지름 한 단계 더 바깥)으로 넘어가 계속 찾는다 — 골든 앵글 나선처럼
// 규칙적인 순서로 훑으면 점이 많아졌을 때 나선/소용돌이 무늬가 눈에 띄게 되므로(피보나치
// 해바라기 패턴), 일부러 매 시도를 서로 무관한 무작위 위치로 뽑는다. 자리가 좁아 계속
// 실패해도(팀/별이 많이 몰린 경우) 링이 계속 넓어지므로 결국 바깥쪽에서 반드시 빈자리를
// 찾아낸다. scoreFn은 0 이상이면 "완전히 조건을 만족", 음수면 그 정도로 위반(더 큰 음수가
// 더 나쁨)을 뜻한다 — 끝까지 못 찾으면 시도한 것 중 점수가 가장 좋은(덜 나쁜) 후보를 쓴다.
function searchSpot(
  seed: number,
  scoreFn: (x: number, y: number) => number,
  maxTries: number,
  startRadius: number,
  radiusGrowth: number
): { x: number; y: number } {
  const TRIES_PER_RING = 24;
  let bestX = CENTER_X, bestY = CENTER_Y, bestScore = -Infinity;
  for (let i = 0; i < maxTries; i++) {
    const ring = Math.floor(i / TRIES_PER_RING);
    const ang = seededRandom(seed + i * 97 + 41) * Math.PI * 2;
    const r = startRadius + radiusGrowth * ring + seededRandom(seed + i * 131 + 59) * radiusGrowth;
    const x = CENTER_X + r * Math.cos(ang), y = CENTER_Y + r * Math.sin(ang) * Y_SQUISH;
    const score = scoreFn(x, y);
    if (score > bestScore) { bestScore = score; bestX = x; bestY = y; }
    if (score >= 0) return { x, y };
  }
  return { x: bestX, y: bestY };
}

// 그룹 하나의 "로컬" 모양을 만든다(팀들을 임의의 기준 좌표계에서 서로 이어붙인 상태 —
// 아직 은하 전체 좌표로 옮기기 전). 그룹 안 팀들을 공유 멤버 그래프의 신장 트리(BFS) 순서로
// 하나씩 배치하되, 부모 팀과 이어지는 자리(공유 멤버)는 정확히 그 위치에 고정하고, 나머지
// 회전 각도는 이미 놓인 다른 팀들과 겹치거나 교차하지 않는 후보를 여러 개 시도해 고른다.
function buildGroupLocalShape(group: TeamCluster[]): {
  localPos: Map<number, { x: number; y: number }>;
  teamEdgesLocal: Map<number, [number, number][]>;
} {
  const sorted = [...group].sort((a, b) => a.id - b.id);
  const adj = teamAdjacencyWithin(sorted);
  const localPos = new Map<number, { x: number; y: number }>();
  const teamEdgesLocal = new Map<number, [number, number][]>();
  const placedShapes: { points: [number, number][]; edges: [number, number][] }[] = [];

  function placeTeam(team: TeamCluster, fixedUserId: number | null, fixedPos: { x: number; y: number } | null) {
    const members = [...new Set(team.memberIds)].sort((a, b) => a - b);
    const ordered = fixedUserId !== null
      ? [fixedUserId, ...members.filter(m => m !== fixedUserId)]
      : members;
    const shapeIdx = team.id % SHAPES.length;
    const shape = buildShapeForSize(shapeIdx, ordered.length, team.id * 97 + 13);

    const CANDIDATES = 16;
    let best: { pts: [number, number][]; score: number } | null = null;
    for (let c = 0; c < CANDIDATES; c++) {
      const rot = (c / CANDIDATES) * Math.PI * 2 + team.id * 0.37;
      const cosr = Math.cos(rot), sinr = Math.sin(rot);
      const anchor = shape.points[0] ?? [0, 0];
      const arx = anchor[0] * cosr - anchor[1] * sinr;
      const ary = anchor[0] * sinr + anchor[1] * cosr;
      const baseX = fixedPos ? fixedPos.x - arx * BASE_SCALE : 0;
      const baseY = fixedPos ? fixedPos.y - ary * BASE_SCALE : 0;
      const pts: [number, number][] = shape.points.map(([x, y]) => {
        const rx = x * cosr - y * sinr, ry = x * sinr + y * cosr;
        return [baseX + rx * BASE_SCALE, baseY + ry * BASE_SCALE];
      });

      let minClearance = Infinity;
      let crossFound = false;
      for (const placed of placedShapes) {
        for (const [a1i, a2i] of shape.edges) {
          for (const [b1i, b2i] of placed.edges) {
            if (segmentsCross(pts[a1i], pts[a2i], placed.points[b1i], placed.points[b2i])) crossFound = true;
          }
        }
        for (const p of pts) for (const q of placed.points) {
          minClearance = Math.min(minClearance, Math.hypot(p[0] - q[0], p[1] - q[1]));
        }
        // 정점끼리는 안 겹쳐도, 이 팀의 점이 이미 놓인 팀의 "선" 위에 걸치거나(혹은 그
        // 반대) 하는 경우까지 함께 확인한다 — 그래야 다른(같은 그룹 내) 팀의 선 위에 별이
        // 있는 상황을 막을 수 있다.
        for (const p of pts) for (const [b1i, b2i] of placed.edges) {
          minClearance = Math.min(minClearance, pointSegDist(p[0], p[1],
            placed.points[b1i][0], placed.points[b1i][1], placed.points[b2i][0], placed.points[b2i][1]));
        }
        for (const q of placed.points) for (const [a1i, a2i] of shape.edges) {
          minClearance = Math.min(minClearance, pointSegDist(q[0], q[1],
            pts[a1i][0], pts[a1i][1], pts[a2i][0], pts[a2i][1]));
        }
      }
      const score = crossFound ? minClearance - 1000 : minClearance;
      if (!best || score > best.score) best = { pts, score };
      if (placedShapes.length === 0) break; // 첫 팀은 비교 대상이 없으니 바로 확정
    }

    const pts = best!.pts;
    placedShapes.push({ points: pts, edges: shape.edges });
    ordered.forEach((uid, idx) => {
      if (!localPos.has(uid)) localPos.set(uid, { x: pts[idx][0], y: pts[idx][1] });
    });
    teamEdgesLocal.set(team.id, shape.edges.map(([a, b]) => [ordered[a], ordered[b]] as [number, number]));
  }

  placeTeam(sorted[0], null, null);
  const visited = new Set<number>([sorted[0].id]);
  const queue: number[] = [sorted[0].id];
  while (queue.length > 0) {
    const curId = queue.shift()!;
    for (const nb of adj.get(curId) ?? []) {
      if (visited.has(nb.otherTeamId)) continue;
      visited.add(nb.otherTeamId);
      const parentPos = localPos.get(nb.sharedUserId)!;
      const nextTeam = sorted.find(t => t.id === nb.otherTeamId)!;
      placeTeam(nextTeam, nb.sharedUserId, parentPos);
      queue.push(nb.otherTeamId);
    }
  }

  return { localPos, teamEdgesLocal };
}

// 포아송 디스크(블루 노이즈) 샘플링 — Bridson's algorithm. 서로 최소 간격(minDist)을 지키며
// 화면을 채우는, 게임/그래픽스에서 별·풀 등을 "자연스럽게 무작위로" 흩뿌릴 때 쓰는 표준
// 기법이다. 단순히 각 점마다 독립적으로 각도/반지름을 뽑는 방식은 점이 많아지면 우연히
// 뭉치거나 비는 구간이 생겨 오히려 "규칙이 있어 보이는" 인상을 준다 — 이 방식은 그런
// 뭉침/빈틈 없이 고르면서도 완전한 격자는 아닌, 진짜 별자리 사진 같은 흩어짐을 만든다.
// isValidFinal은 화면(x,y) 기준 추가 제약(팀 별/선분 회피)이고, 점끼리의 최소 간격은
// 이 함수 내부의 격자로 확인한다(원본 알고리즘과 동일하게 등방(u,v) 좌표계에서 계산한 뒤
// 마지막에만 타원 비율(Y_SQUISH)을 곱해 화면 좌표로 바꾼다).
function poissonDiskFill(
  count: number,
  minDist: number,
  domainRadius: number,
  isValidFinal: (x: number, y: number) => boolean,
  seed: number
): { x: number; y: number }[] {
  if (count <= 0) return [];
  let counter = 0;
  const rng = () => seededRandom(seed + (counter++) * 101 + 7);
  const cell = minDist / Math.SQRT2;
  const gridKey = (u: number, v: number) => `${Math.floor(u / cell)}:${Math.floor(v / cell)}`;
  const grid = new Map<string, { u: number; v: number }>();
  const uv: { u: number; v: number }[] = [];
  const active: number[] = [];

  function toFinal(u: number, v: number) { return { x: CENTER_X + u, y: CENTER_Y + v * Y_SQUISH }; }
  function farEnough(u: number, v: number): boolean {
    const gx = Math.floor(u / cell), gy = Math.floor(v / cell);
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
      const p = grid.get(`${gx + dx}:${gy + dy}`);
      if (p && Math.hypot(p.u - u, p.v - v) < minDist) return false;
    }
    return true;
  }
  function tryAdd(u: number, v: number): boolean {
    if (Math.hypot(u, v) > domainRadius) return false;
    const f = toFinal(u, v);
    if (!isValidFinal(f.x, f.y)) return false;
    if (!farEnough(u, v)) return false;
    uv.push({ u, v });
    grid.set(gridKey(u, v), { u, v });
    active.push(uv.length - 1);
    return true;
  }

  for (let tries = 0; tries < 2000 && uv.length === 0; tries++) {
    const ang = rng() * Math.PI * 2, r = Math.sqrt(rng()) * domainRadius;
    tryAdd(r * Math.cos(ang), r * Math.sin(ang));
  }

  const K = 30;
  while (active.length > 0 && uv.length < count) {
    const activeIdx = Math.floor(rng() * active.length);
    const src = uv[active[activeIdx]];
    let placed = false;
    for (let t = 0; t < K; t++) {
      const ang = rng() * Math.PI * 2;
      const rad = minDist * (1 + rng());
      if (tryAdd(src.u + Math.cos(ang) * rad, src.v + Math.sin(ang) * rad)) { placed = true; break; }
    }
    if (!placed) active.splice(activeIdx, 1);
  }

  return uv.slice(0, count).map(({ u, v }) => toFinal(u, v));
}

// 은하 전체 배치 + 팀별 별자리 선을 함께 계산한다. positions는 팀 소속 여부와 무관하게
// 모든 별의 최종 좌표(%), teamEdges는 팀마다 실제로 그릴 선분(유저 id 쌍)이다.
export function galaxyLayout(
  ids: number[], teams: TeamCluster[]
): { positions: Map<number, { x: number; y: number }>; teamEdges: Map<number, [number, number][]> } {
  const sorted = [...teams].sort((a, b) => a.id - b.id);
  const groups = groupTeams(sorted);

  const finalPos = new Map<number, { x: number; y: number }>();
  const teamEdges = new Map<number, [number, number][]>();

  interface WorldGroup {
    key: number;
    localPos: Map<number, { x: number; y: number }>;
    teamEdgesLocal: Map<number, [number, number][]>;
    centroid: { x: number; y: number };
    boundRadius: number;
  }
  const worldGroups: WorldGroup[] = groups.map(group => {
    const { localPos, teamEdgesLocal } = buildGroupLocalShape(group);
    const pts = [...localPos.values()];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const boundRadius = Math.max(1, ...pts.map(p => Math.hypot(p.x - cx, p.y - cy)));
    return { key: group[0].id, localPos, teamEdgesLocal, centroid: { x: cx, y: cy }, boundRadius };
  });

  // 그룹끼리(별자리 뭉치끼리) 서로 겹치지 않도록 — 큰 그룹부터 배치해 자리를 먼저 잡게 한다.
  // 자리가 좁아지면(팀이 많거나 큰 경우) 나선을 따라 바깥쪽으로 계속 찾아 결국 겹치지 않는
  // 자리를 반드시 찾아낸다 — 고정된 반경 안에서 몇 번 찍어보고 포기하지 않는다.
  const GROUP_CLEARANCE = 6;
  const placedCircles: { x: number; y: number; r: number }[] = [];
  [...worldGroups].sort((a, b) => b.boundRadius - a.boundRadius).forEach(g => {
    const scoreFn = (x: number, y: number) => {
      if (placedCircles.length === 0) return 1;
      return Math.min(...placedCircles.map(c =>
        Math.hypot(x - c.x, y - c.y) - (c.r + g.boundRadius + GROUP_CLEARANCE)));
    };
    const chosen = searchSpot(g.key * 211, scoreFn, 400, g.boundRadius + 8, 7);
    placedCircles.push({ x: chosen.x, y: chosen.y, r: g.boundRadius });
    const dx = chosen.x - g.centroid.x, dy = chosen.y - g.centroid.y;
    g.localPos.forEach((p, uid) => finalPos.set(uid, { x: p.x + dx, y: p.y + dy }));
    g.teamEdgesLocal.forEach((edges, teamId) => teamEdges.set(teamId, edges));
  });

  // 무소속 별: 팀 선분 근처를 피해서(선 위/사이에 별이 걸치지 않게) 원 전체에 흩뿌린다.
  // 이때 단순 난수(각도/반지름을 각자 독립적으로 뽑는 방식)는 점이 많아지면 오히려 군데군데
  // 뭉치거나 듬성듬성 빈 곳이 생겨 "규칙 있어 보인다"는 인상을 준다 — 실제 밤하늘의 별처럼
  // 자연스럽게 흩어져 보이려면 서로 최소 간격을 유지하며 채우는 블루 노이즈(포아송 디스크)
  // 방식이 알맞다(게임/그래픽스에서 별·풀·나무 같은 걸 "자연스럽게" 흩뿌릴 때 쓰는 표준
  // 기법). 팀 선분/별과도 충분히 떨어진 위치만 후보로 인정한다.
  const allEdgeSegs: { x1: number; y1: number; x2: number; y2: number }[] = [];
  teamEdges.forEach(edges => edges.forEach(([a, b]) => {
    const pa = finalPos.get(a), pb = finalPos.get(b);
    if (pa && pb) allEdgeSegs.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y });
  }));
  const teamPts = [...finalPos.values()];
  const MIN_STAR_DIST = 5;
  const LINE_CLEARANCE = 3;
  const bgIds = ids.filter(id => !finalPos.has(id));

  function isValidBackgroundSpot(x: number, y: number): boolean {
    for (const p of teamPts) if (Math.hypot(x - p.x, y - p.y) < MIN_STAR_DIST) return false;
    for (const e of allEdgeSegs) if (pointSegDist(x, y, e.x1, e.y1, e.x2, e.y2) < LINE_CLEARANCE) return false;
    return true;
  }

  const bgPositions = poissonDiskFill(bgIds.length, MIN_STAR_DIST, RADIUS_MAX, isValidBackgroundSpot, 90210);
  bgIds.forEach((id, i) => {
    const p = bgPositions[i];
    if (p) { finalPos.set(id, p); return; }
    // 포아송 디스크가 자리를 다 채워 더는 못 찾은 아주 드문 경우에 대한 안전망.
    const placedPts = [...finalPos.values(), ...bgIds.slice(0, i).map(bid => finalPos.get(bid)!)];
    const scoreFn = (x: number, y: number) => {
      const starSlack = Math.min(...placedPts.map(q => Math.hypot(x - q.x, y - q.y) - MIN_STAR_DIST));
      const lineSlack = allEdgeSegs.length === 0
        ? Infinity
        : Math.min(...allEdgeSegs.map(e => pointSegDist(x, y, e.x1, e.y1, e.x2, e.y2) - LINE_CLEARANCE));
      return Math.min(starSlack, lineSlack);
    };
    finalPos.set(id, searchSpot(id * 13 + 18, scoreFn, 200, RADIUS_MAX * 0.15, 4));
  });

  // 은하 중심에서 SPREAD배 밀어낸다 — 상대적 배치는 그대로 유지된다.
  ids.forEach(id => {
    const p = finalPos.get(id);
    if (!p) return;
    p.x = CENTER_X + (p.x - CENTER_X) * SPREAD;
    p.y = CENTER_Y + (p.y - CENTER_Y) * SPREAD;
  });
  // 화면(0~100%) 안에 가두는 클램프가 아니라, 은하 중심에서 너무 멀리(찾아가기 힘들 만큼)
  // 발산하는 것만 막는 안전망이다. 팀(별자리) 멤버는 개별 별 하나하나를 따로 클램프하면
  // 안 된다 — 같은 별자리 안에서도 별마다 중심에서의 거리가 조금씩 다르면 저마다 다른
  // 비율로 당겨져 모양 자체가 일그러진다(실제로 이 문제로 별자리 두 점이 거의 겹쳐버린
  // 적이 있었다). 그래서 그룹 전체를 "하나의 덩어리"로 보고 중심(centroid) 기준 거리로만
  // 판단해, 넘치면 그룹 전체를 같은 비율로 당겨 모양은 그대로 유지한 채 끌어온다.
  worldGroups.forEach(g => {
    const memberIds = [...g.localPos.keys()];
    const pts = memberIds.map(uid => finalPos.get(uid)!);
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const dist = Math.hypot(cx - CENTER_X, cy - CENTER_Y);
    if (dist > MAX_RADIUS_FROM_CENTER) {
      const k = MAX_RADIUS_FROM_CENTER / dist;
      const ncx = CENTER_X + (cx - CENTER_X) * k, ncy = CENTER_Y + (cy - CENTER_Y) * k;
      memberIds.forEach(uid => {
        const p = finalPos.get(uid)!;
        finalPos.set(uid, { x: ncx + (p.x - cx), y: ncy + (p.y - cy) });
      });
    }
  });
  // 무소속 별은 그룹 구조가 없으니 각자 개별적으로 클램프해도 모양이 일그러질 일이 없다.
  const teamedIds = new Set(worldGroups.flatMap(g => [...g.localPos.keys()]));
  ids.forEach(id => {
    if (teamedIds.has(id)) return;
    const p = finalPos.get(id);
    if (!p) return;
    const dx = p.x - CENTER_X, dy = p.y - CENTER_Y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS_FROM_CENTER) {
      const k = MAX_RADIUS_FROM_CENTER / dist;
      p.x = CENTER_X + dx * k;
      p.y = CENTER_Y + dy * k;
    }
  });

  return { positions: finalPos, teamEdges };
}
